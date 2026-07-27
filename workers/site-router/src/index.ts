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
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405 })
    }

    const url = new URL(request.url)

    // Canonical public URL. Apply every normalization in one response so that
    // combinations such as http + www + /index.html never form a redirect chain.
    const canonicalUrl = new URL(url)
    canonicalUrl.protocol = 'https:'
    canonicalUrl.hostname = 'formawizerunku.pl'
    if (canonicalUrl.pathname === '/index.html') canonicalUrl.pathname = '/'

    if (url.toString() !== canonicalUrl.toString()) {
      return Response.redirect(canonicalUrl.toString(), 301)
    }

    const tenantId = parseHostMap(env.HOST_MAP)[url.hostname]
    if (!tenantId) return new Response('Unknown host', { status: 404 })

    const base = `sites/${tenantId}`
    let path = decodeURIComponent(url.pathname)
    if (path === '/' || path === '') path = '/index.html'

    // Try the exact key, then extensionless fallbacks (foo -> foo.html, foo/ -> foo/index.html).
    const last = path.split('/').pop() ?? ''
    const candidates = [`${base}${path}`]
    if (!last.includes('.')) {
      candidates.push(`${base}${path}.html`)
      candidates.push(`${base}${path.endsWith('/') ? path : path + '/'}index.html`)
    }

    for (const key of candidates) {
      const obj = await env.SITE_BUCKET.get(key)
      if (obj) return serve(obj)
    }

    const redirectTo = await resolveRedirect(env.SITE_BUCKET, base, path)
    if (redirectTo) {
      const target = new URL(redirectTo, canonicalUrl.origin)
      return Response.redirect(target.toString(), 301)
    }

    const notFound = await env.SITE_BUCKET.get(`${base}/404.html`)
    if (notFound) return serve(notFound, 404)
    return new Response('Not found', { status: 404 })
  },
}
