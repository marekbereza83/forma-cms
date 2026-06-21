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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405 })
    }

    const url = new URL(request.url)
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

    const notFound = await env.SITE_BUCKET.get(`${base}/404.html`)
    if (notFound) return serve(notFound, 404)
    return new Response('Not found', { status: 404 })
  },
}
