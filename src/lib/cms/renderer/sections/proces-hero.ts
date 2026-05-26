import type { Section } from '../../types'

const CHECK_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12"/></svg>`

export function renderProcesHero(section: Section): string {
  const tag      = section.fields['tag']?.value as string
  const headline = section.fields['headline']?.value as string
  const lead     = section.fields['lead']?.value as string

  return `<!-- SEKCJA: proces-hero -->
<section id="proces-hero" class="section bg-base" aria-labelledby="proces-heading">
  <div class="container">
    <div class="cta-finale-inner">
      <span class="tag tag-inline">
        ${CHECK_ICON}
        ${tag}
      </span>
      <h1 id="proces-heading" class="f-display">
        ${headline}
      </h1>
      <p class="f-lead max-58">
        ${lead}
      </p>
    </div>
  </div>
</section>`
}
