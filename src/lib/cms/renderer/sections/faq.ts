import type { Section, FaqItem } from '../../types'

export function renderFaq(section: Section): string {
  const headline = section.fields['headline']?.value as string
  const items    = section.fields['items']?.value as FaqItem[]

  // NOTE: item.answer may contain "10-15 min" (ASCII hyphen).
  // Reference has "10–15 min" (U+2013 en-dash) — banned by whitelist. Conscious difference.
  const itemsHtml = items.map(item => `
      <div class="faq-item">
        <button class="faq-question" aria-expanded="false" aria-controls="faq-${item.id}">
          ${item.question}
          <span class="faq-toggle" aria-hidden="true">+</span>
        </button>
        <div class="faq-answer" id="faq-${item.id}">
          ${item.answer}
        </div>
      </div>`).join('\n')

  return `<!-- SEKCJA: faq -->
<section id="faq" class="section bg-base reveal" aria-labelledby="faq-heading">
  <div class="container">
    <div class="section-header">
      <span class="section-label">FAQ</span>
      <h2 id="faq-heading" class="f-headline">${headline}</h2>
    </div>

    <div class="max-prose" aria-label="Najczęściej zadawane pytania">
${itemsHtml}
    </div>
  </div>
</section>`
}
