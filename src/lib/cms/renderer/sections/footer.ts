import type { Section, FooterLink } from '../../types'
import type { RenderContext } from '../context'
import { pageHref } from '../utils'

function transformFooterHref(href: string, linkMode: 'static' | 'preview'): string {
  if (linkMode === 'static') return href
  const match = href.match(/^([\w-]+)\.html$/)
  if (!match) return href
  return `/preview?page=${match[1]}`
}

/**
 * @param ctx.showCurrentInFooter — gdy true: bez <nav> wrappera, aria-current="page" na bieżącej stronie.
 *   Używane przez: kontakt, legal-notice, privacy-policy.
 *   Gdy false: <nav aria-label="Nawigacja stopki"> wrapper, bez aria-current (index, portfolio, proces).
 */
export function renderFooter(section: Section, ctx: RenderContext): string {
  const logoText  = section.fields['logoText']?.value as string
  const links     = section.fields['links']?.value as FooterLink[]
  const copyright = section.fields['copyright']?.value as string

  const logoHref = pageHref('index', ctx.linkMode)

  if (ctx.showCurrentInFooter) {
    const seoSlug = 'strony-dla-kancelarii-prawnych'
    const isSeoCurrent = ctx.currentPage === seoSlug
    const seoHref = ctx.hasSeoPage ? transformFooterHref(`${seoSlug}.html`, ctx.linkMode) : null
    const seoLinkHtml = seoHref
      ? `\n      <li><a href="${seoHref}"${isSeoCurrent ? ' aria-current="page"' : ''}>Strony internetowe dla kancelarii prawnych</a></li>`
      : ''
    const linksHtml = links
      .map(l => {
        const href = transformFooterHref(l.href, ctx.linkMode)
        const isCurrent = l.href.replace(/\.html$/, '') === ctx.currentPage
        return `      <li><a href="${href}"${isCurrent ? ' aria-current="page"' : ''}>${l.label}</a></li>`
      })
      .join('\n') + seoLinkHtml

    return `<!-- SEKCJA: stopka -->
<footer class="footer" role="contentinfo" aria-label="Stopka strony">
  <div class="container footer-inner">
    <a href="${logoHref}" class="footer-logo" aria-label="${logoText} — strona główna">${logoText}</a>
    <ul class="footer-links" role="list">
${linksHtml}
    </ul>
    <div class="footer-contact">
      <a href="tel:${ctx.contactPhone}" aria-label="Zadzwoń: ${ctx.contactPhoneDisplay}">${ctx.contactPhoneDisplay}</a>
      <a href="${ctx.contactEmailHref}" aria-label="Napisz: ${ctx.contactEmail}">${ctx.contactEmail}</a>
    </div>
    <p class="footer-copy">${copyright}</p>
  </div>
</footer>`
  }

  const seoHref = ctx.hasSeoPage ? transformFooterHref('strony-dla-kancelarii-prawnych.html', ctx.linkMode) : null
  const linksHtml = links
    .map(l => {
      const href = transformFooterHref(l.href, ctx.linkMode)
      return `        <li><a href="${href}">${l.label}</a></li>`
    })
    .join('\n') + (seoHref ? `\n        <li><a href="${seoHref}">Strony internetowe dla kancelarii prawnych</a></li>` : '')

  return `<!-- SEKCJA: stopka -->
<footer class="footer" role="contentinfo" aria-label="Stopka strony">
  <div class="container footer-inner">
    <a href="${logoHref}" class="footer-logo" aria-label="${logoText} — strona główna">
      ${logoText}
    </a>
    <nav aria-label="Nawigacja stopki">
      <ul class="footer-links" role="list">
${linksHtml}
      </ul>
    </nav>
    <div class="footer-contact">
      <a href="tel:${ctx.contactPhone}" aria-label="Zadzwoń: ${ctx.contactPhoneDisplay}">${ctx.contactPhoneDisplay}</a>
      <a href="${ctx.contactEmailHref}" aria-label="Napisz: ${ctx.contactEmail}">${ctx.contactEmail}</a>
    </div>
    <p class="footer-copy">${copyright}</p>
  </div>
</footer>`
}
