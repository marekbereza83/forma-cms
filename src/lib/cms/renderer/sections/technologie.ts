import type { Section } from '../../types'

export function renderTechnologie(section: Section): string {
  const headline = section.fields['headline']?.value as string
  const lead     = section.fields['lead']?.value as string
  const tags     = section.fields['tags']?.value as string[]

  const tagsHtml = tags.map(tag => `      <span class="tag">${tag}</span>`).join('\n')

  return `<!-- SEKCJA: technologie -->
<section id="technologie" class="section bg-base reveal" aria-labelledby="tech-heading">
  <div class="container">
    <div class="section-header">
      <span class="section-label">Stack</span>
      <h2 id="tech-heading" class="f-headline">${headline}</h2>
      <p class="f-lead mt-4 max-58">
        ${lead}
      </p>
    </div>

    <div class="tech-tags stagger-reveal" aria-label="Lista technologii">
${tagsHtml}
    </div>
  </div>
</section>`
}
