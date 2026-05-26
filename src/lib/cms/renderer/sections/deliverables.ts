import type { Section, DeliverableItem } from '../../types'

const CHECK_ICON = `<svg class="deliverable-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12"/></svg>`

export function renderDeliverables(section: Section): string {
  const headline = section.fields['headline']?.value as string
  const items    = section.fields['items']?.value as DeliverableItem[]

  // NOTE: item.body may contain "10-15 min" (ASCII hyphen).
  // Reference has "10–15 min" (U+2013 en-dash) — banned by whitelist. Conscious difference.
  const itemsHtml = items.map(item => `
      <div class="deliverable-item">
        ${CHECK_ICON}
        <div>
          <p class="process-step-title">${item.title}</p>
          <p class="process-step-body">${item.body}</p>
        </div>
      </div>`).join('\n')

  return `<!-- SEKCJA: deliverables -->
<section id="deliverables" class="section bg-surface reveal" aria-labelledby="deliverables-heading">
  <div class="container">
    <div class="section-header">
      <span class="section-label">Co dostajesz</span>
      <h2 id="deliverables-heading" class="f-headline">${headline}</h2>
    </div>

    <div class="deliverables-grid stagger-reveal">
${itemsHtml}
    </div>
  </div>
</section>`
}
