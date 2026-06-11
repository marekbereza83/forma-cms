import type { Section } from '../../types'

const CHECK_ICON = `<svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12"/></svg>`
const TAG_CHECK_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12"/></svg>`

export function renderSolution(section: Section): string {
  const headline = section.fields['headline']?.value as string
  const body1 = section.fields['body1']?.value as string
  const body2 = section.fields['body2']?.value as string
  const checklistTag = section.fields['checklistTag']?.value as string
  const checklistItems = section.fields['checklistItems']?.value as string[]
  const microcopy = section.fields['microcopy']?.value as string

  const checklistHtml = checklistItems.map(item => `
          <li>
            ${CHECK_ICON}
            ${item}
          </li>`).join('')

  return `<!-- SEKCJA: rozwiązanie -->
<section id="solution" class="section bg-base reveal" aria-labelledby="solution-heading">
  <div class="container">
    <div class="solution-inner">

      <div>
        <span class="section-label">Rozwiązanie</span>
        <h2 id="solution-heading" class="f-headline mb-6">
          ${headline}
        </h2>
        <p class="f-body section-text-block">
          ${body1}
        </p>
        <p class="f-body section-text-block mb-8">
          ${body2}
        </p>
      </div>

      <div class="card solution-infobox">
        <span class="tag tag-inline">
          ${TAG_CHECK_ICON}
          ${checklistTag}
        </span>
        <ul class="solution-checklist" aria-label="Elementy systemu PACTA">
${checklistHtml}
        </ul>
        <p class="btn-micro mt-6">
          ${microcopy}
        </p>
      </div>

    </div>
  </div>
</section>`
}
