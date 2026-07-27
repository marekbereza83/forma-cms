import type { SiteMeta, PageMeta } from '../types'

/**
 * Uproszczony <head> dla stron utility (legal-notice, privacy-policy, 404).
 * Bez tagów OG / Twitter / canonical / schema.org — zgodnie z referencją.
 * robots: 'noindex, follow' dla legal, 'noindex, nofollow' dla 404.
 */
function gaSnippet(gaId: string): string {
  // Consent Mode v2 — domyślnie wszystko 'denied'. GA nie ustawia cookies analitycznych
  // dopóki użytkownik nie zaakceptuje przez baner (patrz cookie-consent.ts).
  // Wcześniejszą zgodę odtwarzamy z localStorage przed wczytaniem GA.
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});try{if(localStorage.getItem('forma-cookie-consent')==='granted'){gtag('consent','update',{analytics_storage:'granted'});}}catch(e){}gtag('js',new Date());gtag('config','${gaId}');</script>`
}

export function renderLegalHead(title: string, basePath = '', robots = 'noindex, follow', gaId?: string): string {
  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="robots" content="${robots}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${basePath}assets/css/design-system-agency.css">
<link rel="stylesheet" href="${basePath}assets/css/forma-layout.css">
<link rel="stylesheet" href="${basePath}assets/css/forma-components.css">
${gaId ? gaSnippet(gaId) : ''}
</head>`
}

export function renderHead(
  siteMeta: SiteMeta,
  pageMeta: PageMeta | undefined,
  pricingAmount: string | undefined,
  basePath = '',
  ogImage?: string
): string {
  const title = pageMeta?.title ?? siteMeta.title
  const description = pageMeta?.description ?? siteMeta.description
  const canonical = pageMeta?.canonical ?? siteMeta.canonical
  const ogTitle = pageMeta?.ogTitle ?? siteMeta.title
  const ogDescription = pageMeta?.ogDescription ?? siteMeta.ogDescription
  const ogUrl = pageMeta?.ogUrl ?? siteMeta.canonical

  let schemaOrg = ''
  if (pricingAmount !== undefined) {
    const schemaOrgUrl = siteMeta.canonical.replace(/\/$/, '')
    const priceRange = `od ${pricingAmount.replace(/ /g, '')} zł`
    schemaOrg = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "name": "${siteMeta.brandName}",
  "description": "Projektowanie stron internetowych dla kancelarii prawnych. System PACTA.",
  "url": "${schemaOrgUrl}",
  "email": "${siteMeta.contactEmail}",
  "priceRange": "${priceRange}",
  "areaServed": "PL",
  "serviceType": "Web Design",
  "knowsAbout": ["strony dla kancelarii", "web design prawniczy", "SEO dla prawników"]
}
</script>`
  }

  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="icon" type="image/jpeg" href="${basePath}assets/images/favicon.jpeg">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${ogDescription}">
<meta property="og:url" content="${ogUrl}">
<meta property="og:image" content="${ogImage ?? siteMeta.ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${ogTitle}">
<meta name="twitter:description" content="${ogDescription}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${basePath}assets/css/design-system-agency.css">
<link rel="stylesheet" href="${basePath}assets/css/forma-layout.css">
<link rel="stylesheet" href="${basePath}assets/css/forma-components.css">
${schemaOrg}
${siteMeta.gaId ? gaSnippet(siteMeta.gaId) : ''}
</head>`
}
