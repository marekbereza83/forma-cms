/**
 * FORMA site-router — serves published static sites from R2 on tenant domains.
 *
 * Each tenant's site lives under `sites/<tenantId>/` in the R2 bucket (written by
 * the CMS via /api/publish → lib/cms/publish.ts). This Worker maps the incoming
 * hostname to a tenantId and streams the matching object back, with index.html /
 * .html fallback resolution and a per-site 404 page.
 *
 * One Worker serves all tenants. Add a domain by adding it to HOST_MAP and
 * attaching a custom domain route in the Cloudflare dashboard (see README.md).
 */

export interface Env {
  /** R2 bucket binding — the same bucket the CMS uploads to (R2_BUCKET). */
  SITE_BUCKET: R2Bucket
  /** JSON map of hostname -> tenantId, e.g. {"kancelaria.pl":"abc","www.kancelaria.pl":"abc"} */
  HOST_MAP: string
  /**
   * Optional JSON map of non-canonical hostname -> canonical hostname, e.g.
   * {"www.formawizerunku.pl":"formawizerunku.pl"}. Only hosts listed here get
   * redirected to their canonical counterpart; any other host present in
   * HOST_MAP is already canonical and is served as-is. This is what lets
   * multiple tenant hostnames (kancelaria.pl, en.formawizerunku.pl, ...) coexist
   * without each being redirected to a single hardcoded domain.
   */
  CANONICAL_HOST_MAP?: string
}

function parseHostMap(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function serve(obj: R2ObjectBody, status = 200): Response {
  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set('etag', obj.httpEtag)
  if (!headers.has('content-type')) headers.set('content-type', 'application/octet-stream')
  return new Response(obj.body, { status, headers })
}

// Cache brzegowy (Workers Cache API) — dodany 2026-07-30 po zmierzeniu, ze KAZDE
// zadanie (bez wyjatku) odpytywalo R2 na zywo: brak Cache-Control, brak CF-Cache-Status
// w odpowiedzi. TTL 60s — skrocone z pierwotnych 5 min (2026-07-30) na prosbe
// uzytkownika: krotsze okno nieswiezosci po "Publikuj" wazniejsze niz dodatkowa
// redukcja odczytow R2. Nadal brak invalidacji przy publikacji — swiadomie poza
// zakresem tej zmiany; jesli nawet 60s okaze sie za dlugie, nastepny krok to purge
// cache z publishSite() po udanym uploadzie.
const CACHE_TTL_SECONDS = 60

// Klucz cache budowany z tenantId + sciezki zadania, NIE z pelnego URL — nawet teraz,
// gdy kanonizacja jest per-host (patrz CANONICAL_HOST_MAP), klucz oparty na URL
// kolidowalby miedzy hostami wskazujacymi na tego samego tenanta (apex + www).
// Klucz oparty na tenantId jest poprawny niezaleznie od tego, przez ktory host przyszlo zadanie.
function cacheKeyFor(tenantId: string, path: string): Request {
  return new Request(`https://cache.internal/${tenantId}${path}`)
}

// Serwuje z R2 I zapisuje do cache w tle (ctx.waitUntil — nie opoznia odpowiedzi).
// response.clone() przed dopisaniem Cache-Control, bo obj.body to strumien
// jednorazowego odczytu — oryginal wraca do klienta, klon idzie do cache.put().
async function serveAndCache(obj: R2ObjectBody, cache: Cache, cacheKey: Request, ctx: ExecutionContext, status = 200): Promise<Response> {
  const response = serve(obj, status)
  // Ten sam Cache-Control na ODPOWIEDZI co na kopii w cache.put() — bez tego MISS
  // wracal do klienta bez zadnego Cache-Control, wiec przegladarka/posrednie proxy
  // mogly stosowac wlasne, nieprzewidywalne domyslne zasady zamiast naszego 60s.
  response.headers.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`)
  const cacheable = response.clone()
  ctx.waitUntil(cache.put(cacheKey, cacheable))
  response.headers.set('x-forma-cache', 'MISS')
  return response
}

/**
 * Naglowki bezpieczenstwa doklejane do KAZDEJ odpowiedzi (patrz withSecurityHeaders).
 *
 * Swiadomie NIE ma tu Content-Security-Policy: strona ma 3 skrypty inline (m.in. snippet
 * GA z Consent Mode) i blok <style>, wiec 'self' by je zablokowal, a 'unsafe-inline'
 * zniweczylby wiekszosc ochrony. Sensowne CSP wymaga najpierw wyniesienia tych skryptow
 * do plikow w /assets/js/ — osobne zadanie, patrz strategia-seo.md.
 *
 * HSTS bez 'preload' — wpis na liste wbudowana w przegladarki jest trudno odwracalny
 * (miesiace), sam max-age nie.
 *
 * 'includeSubDomains' DOPISANE 2026-07-30 po weryfikacji w panelu Cloudflare (DNS +
 * Workers Routes) wszystkich hostow web-owych pod formawizerunku.pl:
 *   - formawizerunku.pl, www.formawizerunku.pl  -> ten Worker, TLS OK
 *   - app.formawizerunku.pl                     -> Vercel (proxied), TLS OK
 *   - kowalczyk.formawizerunku.pl, mazur.formawizerunku.pl
 *                                                -> INNY Worker (panelforma,
 *     poza tym repo) — strony klientow kancelarii, TLS OK
 *   - ftp.formawizerunku.pl                     -> CNAME donikad, 522 (brak
 *     origin), ale TLS na brzegu Cloudflare dziala — includeSubDomains nic
 *     tu nie psuje, bo i tak nic nie odpowiada
 * Reszta rekordow (DKIM, MX poczty OVH, SPF/DMARC/site-verification) to nie sa
 * hosty HTTP, wiec HSTS ich nie dotyczy.
 *
 * includeSubDomains wymusza polityke na WSZYSTKICH subdomenach niezaleznie od
 * tego, ktory Worker/origin je serwuje (RFC 6797) — stad koniecznosc sprawdzenia
 * kowalczyk./mazur. mimo ze naleza do innego systemu.
 */
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

/**
 * Naklada naglowki bezpieczenstwa na gotowa odpowiedz.
 *
 * Opakowuje CALY handler, a nie samo serve(), bo Worker ma siedem sciezek zwrotu
 * (405, przekierowanie kanoniczne, "Unknown host", plik z R2, przekierowanie 301 ze
 * slugu, strona 404, goly "Not found") — naglowki musza byc na kazdej z nich.
 * Odpowiedzi z Response.redirect() sa niemutowalne, stad budowanie nowej odpowiedzi
 * zamiast res.headers.set(). res.body pozostaje strumieniem, wiec pliki z R2 nadal
 * ida streamem, bez buforowania w pamieci Workera.
 */
function withSecurityHeaders(res: Response): Response {
  const headers = new Headers(res.headers)
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

// _redirects.json (written by lib/cms/export.ts alongside sitemap.xml/robots.txt) maps
// old publikacje/<slug>.html paths to their current address, so a slug change made in
// the panel doesn't 404 old links. Read only on a miss — not on every request.
async function resolveRedirect(bucket: R2Bucket, base: string, path: string): Promise<string | null> {
  const obj = await bucket.get(`${base}/_redirects.json`)
  if (!obj) return null
  try {
    const map = JSON.parse(await obj.text()) as Record<string, string>
    const key = path.replace(/^\/+/, '')
    return map[key] ?? null
  } catch {
    return null
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return withSecurityHeaders(await handle(request, env, ctx))
  },
}

async function handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = new URL(request.url)

  // Canonical public URL. Apply every normalization in one response so that
  // combinations such as http + www + /index.html never form a redirect chain.
  // Hostname is only rewritten when CANONICAL_HOST_MAP names an explicit target
  // (e.g. www -> apex for one tenant) — any other host passes through unchanged,
  // so multiple tenant hostnames can be served by the same Worker.
  const canonicalHostMap = parseHostMap(env.CANONICAL_HOST_MAP ?? '{}')
  const canonicalUrl = new URL(url)
  canonicalUrl.protocol = 'https:'
  canonicalUrl.hostname = canonicalHostMap[url.hostname] ?? url.hostname
  if (canonicalUrl.pathname === '/index.html') canonicalUrl.pathname = '/'

  if (url.toString() !== canonicalUrl.toString()) {
    return Response.redirect(canonicalUrl.toString(), 301)
  }

  const tenantId = parseHostMap(env.HOST_MAP)[url.hostname]
  if (!tenantId) return new Response('Unknown host', { status: 404 })

  const base = `sites/${tenantId}`
  let path = decodeURIComponent(url.pathname)
  if (path === '/' || path === '') path = '/index.html'

  const cache = caches.default
  const cacheKey = cacheKeyFor(tenantId, path)
  const cached = await cache.match(cacheKey)
  if (cached) {
    const res = new Response(cached.body, cached)
    res.headers.set('x-forma-cache', 'HIT')
    return res
  }

  // Try the exact key, then extensionless fallbacks (foo -> foo.html, foo/ -> foo/index.html).
  const last = path.split('/').pop() ?? ''
  const candidates = [`${base}${path}`]
  if (!last.includes('.')) {
    candidates.push(`${base}${path}.html`)
    candidates.push(`${base}${path.endsWith('/') ? path : path + '/'}index.html`)
  }

  for (const key of candidates) {
    const obj = await env.SITE_BUCKET.get(key)
    if (obj) return serveAndCache(obj, cache, cacheKey, ctx)
  }

  const redirectTo = await resolveRedirect(env.SITE_BUCKET, base, path)
  if (redirectTo) {
    const target = new URL(redirectTo, canonicalUrl.origin)
    return Response.redirect(target.toString(), 301)
  }

  const notFound = await env.SITE_BUCKET.get(`${base}/404.html`)
  if (notFound) return serveAndCache(notFound, cache, cacheKey, ctx, 404)
  return new Response('Not found', { status: 404 })
}
