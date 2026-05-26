/**
 * Renderer sekcji strony 404.
 * Treść hardcoded — klient nie edytuje strony błędu.
 * Sygnatura zgodna z SECTION_REGISTRY: (s: Section, linkMode) => string.
 */
import type { Section } from '../../types'
import { pageHref } from '../utils'

export function renderNotFound(_s: Section, linkMode: 'static' | 'preview'): string {
  const indexHref  = pageHref('index',   linkMode)
  const kontaktHref = pageHref('kontakt', linkMode)

  return `<section class="section dot-grid-bg" id="error-page" aria-labelledby="error-heading">
  <div class="container">
    <div class="error-page-inner">
      <p class="error-decorative" aria-hidden="true">404</p>
      <div class="section-header">
        <h1 id="error-heading" class="f-headline">Strona nie istnieje</h1>
        <p class="f-body max-52">
          Strona, której szukasz, mogła zostać przeniesiona, usunięta lub adres URL
          jest niepoprawny. Wróć na stronę główną lub przejdź do kontaktu.
        </p>
        <div class="hero-cta-row">
          <a href="${indexHref}" class="btn-primary btn-magnetic" aria-label="Przejdź do strony głównej Forma Wizerunku">
            Strona główna
          </a>
          <a href="${kontaktHref}" class="btn-ghost" aria-label="Przejdź do formularza kontaktowego">
            Kontakt
          </a>
        </div>
      </div>
    </div>
  </div>
</section>`
}
