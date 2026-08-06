import type { Section, FooterLink } from '../../types'
import type { RenderContext } from '../context'
import { rootHref } from '../utils'
import { t } from '../i18n'

function transformFooterHref(href: string, basePath: string, linkMode: 'static' | 'preview'): string {
  if (linkMode === 'static') return `${basePath}${href}`
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
  const s = t(ctx.lang)
  const logoText  = section.fields['logoText']?.value as string
  const links     = section.fields['links']?.value as FooterLink[]
  const copyright = section.fields['copyright']?.value as string

  const logoHref = rootHref('index', ctx.basePath, ctx.linkMode)

  // Kotwica na frazę główną prowadzi teraz do strony głównej — dawna podstrona
  // /strony-dla-kancelarii-prawnych została z nią scalona (301 obsługuje Worker).
  // Tekst kotwicy zostaje: to jedyny wewnętrzny link z frazą docelową na "/".
  const keywordHref = rootHref('index', ctx.basePath, ctx.linkMode)
  const keywordLabel = s.footer.keywordLabel

  if (ctx.showCurrentInFooter) {
    const seoLinkHtml = `\n      <li><a href="${keywordHref}">${keywordLabel}</a></li>`
    const linksHtml = links
      .map(l => {
        const href = transformFooterHref(l.href, ctx.basePath, ctx.linkMode)
        const isCurrent = l.href.replace(/\.html$/, '') === ctx.currentPage
        return `      <li><a href="${href}"${isCurrent ? ' aria-current="page"' : ''}>${l.label}</a></li>`
      })
      .join('\n') + seoLinkHtml

    return `<!-- SEKCJA: stopka -->
<footer class="footer" role="contentinfo" aria-label="${s.footer.footerAria}">
  <div class="container footer-inner">
    <a href="${logoHref}" class="footer-logo" aria-label="${logoText}${s.shared.logoHomeSuffix}">${logoText}</a>
    <ul class="footer-links" role="list">
${linksHtml}
    </ul>
    <div class="footer-contact">
      <a href="tel:${ctx.contactPhone}" aria-label="${s.shared.callAriaPrefix}${ctx.contactPhoneDisplay}">${ctx.contactPhoneDisplay}</a>
      <a href="${ctx.contactEmailHref}" aria-label="${s.shared.writeAriaPrefix}${ctx.contactEmail}">${ctx.contactEmail}</a>
    </div>
    <p class="footer-copy">${copyright}</p>
  </div>
</footer>`
  }

  const linksHtml = links
    .map(l => {
      const href = transformFooterHref(l.href, ctx.basePath, ctx.linkMode)
      return `        <li><a href="${href}">${l.label}</a></li>`
    })
    .join('\n') + `\n        <li><a href="${keywordHref}">${keywordLabel}</a></li>`

  return `<!-- SEKCJA: stopka -->
<footer class="footer" role="contentinfo" aria-label="${s.footer.footerAria}">
  <div class="container footer-inner">
    <a href="${logoHref}" class="footer-logo" aria-label="${logoText}${s.shared.logoHomeSuffix}">
      ${logoText}
    </a>
    <nav aria-label="${s.footer.footerNavAria}">
      <ul class="footer-links" role="list">
${linksHtml}
      </ul>
    </nav>
    <div class="footer-contact">
      <a href="tel:${ctx.contactPhone}" aria-label="${s.shared.callAriaPrefix}${ctx.contactPhoneDisplay}">${ctx.contactPhoneDisplay}</a>
      <a href="${ctx.contactEmailHref}" aria-label="${s.shared.writeAriaPrefix}${ctx.contactEmail}">${ctx.contactEmail}</a>
    </div>
    <p class="footer-copy">${copyright}</p>
  </div>
</footer>`
}
