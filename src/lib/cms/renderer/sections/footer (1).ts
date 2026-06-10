import type { Section, FooterLink } from '../../types'
import { pageHref } from '../utils'

function transformFooterHref(href: string, linkMode: 'static' | 'preview'): string {
  if (linkMode === 'static') return href
  const match = href.match(/^([\w-]+)\.html$/)
  if (!match) return href
  return `/preview?page=${match[1]}`
}

export function renderFooter(section: Section, currentPage: string, linkMode: 'static' | 'preview'): string {
  const logoText = section.fields['logoText']?.value as string
  const phoneRaw = section.fields['phoneRaw']?.value as string
  const phoneDisplay = section.fields['phoneDisplay']?.value as string
  const email = section.fields['email']?.value as string
  const links = section.fields['links']?.value as FooterLink[]
  const copyright = section.fields['copyright']?.value as string

  const logoHref = pageHref('index', linkMode)

  if (currentPage === 'kontakt') {
    const linksHtml = links
      .map(l => {
        const href = transformFooterHref(l.href, linkMode)
        const isCurrent = l.href.replace(/\.html$/, '') === currentPage
        return `      <li><a href="${href}"${isCurrent ? ' aria-current="page"' : ''}>${l.label}</a></li>`
      })
      .join('\n')

    return `<!-- SEKCJA: stopka -->
<footer class="footer" role="contentinfo" aria-label="Stopka strony">
  <div class="container footer-inner">
    <a href="${logoHref}" class="footer-logo" aria-label="${logoText} — strona główna">${logoText}</a>
    <ul class="footer-links" role="list">
${linksHtml}
    </ul>
    <div class="footer-contact">
      <a href="tel:${phoneRaw}" aria-label="Zadzwoń: ${phoneDisplay}">${phoneDisplay}</a>
      <a href="mailto:${email}" aria-label="Napisz: ${email}">${email}</a>
    </div>
    <p class="footer-copy">${copyright}</p>
  </div>
</footer>`
  }

  const linksHtml = links
    .map(l => {
      const href = transformFooterHref(l.href, linkMode)
      return `        <li><a href="${href}">${l.label}</a></li>`
    })
    .join('\n')

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
      <a href="tel:${phoneRaw}" aria-label="Zadzwoń: ${phoneDisplay}">${phoneDisplay}</a>
      <a href="mailto:${email}" aria-label="Napisz: ${email}">${email}</a>
    </div>
    <p class="footer-copy">${copyright}</p>
  </div>
</footer>`
}
