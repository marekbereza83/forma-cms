/**
 * Renderer sekcji strony 404.
 * Treść hardcoded — klient nie edytuje strony błędu.
 * Sygnatura zgodna z SECTION_REGISTRY: (s: Section, linkMode) => string.
 */
import type { Section } from '../../types'
import type { Lang } from '../context'
import { pageHref } from '../utils'
import { t } from '../i18n'

export function renderNotFound(_s: Section, linkMode: 'static' | 'preview', lang: Lang = 'pl'): string {
  const s = t(lang)
  const indexHref  = pageHref('index',   linkMode)
  const kontaktHref = pageHref('kontakt', linkMode)

  return `<div class="dot-grid-bg" aria-hidden="true"></div>
<section class="section error-page" id="error-page" aria-labelledby="error-heading">
  <div class="container">
    <div class="error-page-inner">
      <p class="error-decorative" aria-hidden="true">404</p>
      <div class="section-header">
        <h1 id="error-heading" class="f-headline">${s.notFound.heading}</h1>
        <p class="f-body max-52">
          ${s.notFound.body}
        </p>
        <div class="hero-cta-row">
          <a href="${indexHref}" class="btn-primary btn-magnetic" aria-label="${s.notFound.homeAria}">
            ${s.notFound.home}
          </a>
          <a href="${kontaktHref}" class="btn-ghost" aria-label="${s.notFound.contactAria}">
            ${s.notFound.contact}
          </a>
        </div>
      </div>
    </div>
  </div>
</section>`
}
