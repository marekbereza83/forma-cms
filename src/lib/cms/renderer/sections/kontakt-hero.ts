import type { Section } from '../../types'

export function renderKontaktHero(section: Section): string {
  const tag = section.fields['tag']?.value as string
  const headline = section.fields['headline']?.value as string
  const body = section.fields['body']?.value as string

  return `<!-- SEKCJA: kontakt-hero -->
<section class="section dot-grid-bg" id="kontakt-hero" aria-labelledby="kontakt-hero-heading">
  <div class="container">
    <div class="section-header reveal">
      <span class="tag">${tag}</span>
      <h1 id="kontakt-hero-heading" class="f-headline max-58">${headline}</h1>
      <p class="f-body max-54">
        ${body}
      </p>
    </div>
  </div>
</section>`
}
