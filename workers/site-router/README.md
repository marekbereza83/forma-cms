# FORMA site-router (Cloudflare Worker)

Serves published static sites from R2 on tenant custom domains.

```
CMS panel  ──"Publikuj"──▶  POST /api/publish  ──▶  R2  sites/<tenantId>/...
tenant domain ──request──▶  this Worker  ──reads──▶  R2  sites/<tenantId>/...  ──▶  HTML
```

The CMS writes the site (`lib/cms/publish.ts`); this Worker reads it. One Worker
serves every tenant — routing is by hostname via `HOST_MAP`.

## One-time setup

Prereq: `npm install` here, and `npx wrangler login` (or set `CLOUDFLARE_API_TOKEN`).

1. **Edit `wrangler.toml`:**
   - `bucket_name` → the same bucket as the app's `R2_BUCKET`.
   - `HOST_MAP` → `{"your-domain.pl":"<tenantId>","www.your-domain.pl":"<tenantId>"}`.
     The tenantId is the `Tenant.id` row (also printed by `scripts/create-tenant.ts`).

2. **Deploy:**
   ```bash
   npm run deploy
   ```

3. **Attach the custom domain** (Cloudflare dashboard → Workers & Pages →
   `forma-site-router` → Settings → Domains & Routes → **Add Custom Domain**).
   The domain's DNS must be on Cloudflare; HTTPS is provisioned automatically.

## Adding another tenant later

Add the hostname→tenantId pair to `HOST_MAP`, `npm run deploy`, then attach the
new custom domain. No code change.

## Notes

- Path resolution: `/` → `index.html`; extensionless paths try `<path>.html` then
  `<path>/index.html`; misses fall back to the site's `404.html`.
- Content-Type comes from the object metadata set at publish time
  (`contentTypeFor` in `src/lib/storage/r2.ts`).
- Uploaded images are served directly from R2's public URL (`R2_PUBLIC_BASE_URL`),
  not through this Worker — they live under `<tenantId>/`, not `sites/<tenantId>/`.
