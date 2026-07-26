import type { Section, StatCard, SymptomCard } from '../../types'

const SYMPTOM_ICONS: Record<string, string> = {
  info: `<svg class="symptom-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  mobile: `<svg class="symptom-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  phone: `<svg class="symptom-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.5 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6.09 6.09l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z"/></svg>`,
}

export function renderProblem(section: Section): string {
  const headline = section.fields['headline']?.value as string
  const lead = section.fields['lead']?.value as string
  const stats = section.fields['stats']?.value as StatCard[]
  const symptomCards = section.fields['symptomCards']?.value as SymptomCard[]

  // Atrybucja źródła — opcjonalna. Renderowana POZA kartą (pod całym stats-row, nie
  // wewnątrz .stat-card), bo stats-row jest dwukolumnowe nawet na mobile: długy tekst
  // atrybucji wewnątrz karty rozciągał ją ponad sąsiednią kartę bez źródła.
  // Link zewnętrzny bez nofollow (źródło ma być traktowane jako zwykłe odesłanie).
  const sourcesHtml = stats
    .filter(s => s.sourceLabel)
    .map(s => {
      const label = s.sourceUrl
        ? `<a href="${s.sourceUrl}" target="_blank" rel="noopener noreferrer">${s.sourceLabel}</a>`
        : s.sourceLabel
      return `
          <p class="stat-source">${label}</p>`
    }).join('')

  const statsHtml = stats.map(s => `
          <div class="stat-card interactive-card">
            <span class="f-stat counter-stat" data-target="${s.target}" data-suffix="${s.suffix}"
              aria-label="${s.ariaLabel}">${s.target}${s.suffix}</span>
            <p>${s.description}</p>
          </div>`).join('')

  const cardsHtml = symptomCards.map(c => `
      <div class="card interactive-card bg-raised">
        ${SYMPTOM_ICONS[c.iconType]}
        <p class="symptom-title">${c.title}</p>
        <p class="symptom-body">${c.body}</p>
      </div>`).join('')

  return `<!-- SEKCJA: problem -->
<section id="problem" class="section bg-surface reveal" aria-labelledby="problem-heading">
  <div class="container">
    <div class="problem-inner">

      <div>
        <span class="section-label">Problem</span>
        <h2 id="problem-heading" class="f-headline">
          ${headline}
        </h2>
      </div>

      <div>
        <p class="f-lead mb-8">
          ${lead}
        </p>

        <div class="stats-row stagger-reveal">
${statsHtml}
        </div>${sourcesHtml ? `
        <div class="stats-sources">${sourcesHtml}
        </div>` : ''}
      </div>

    </div>

    <div class="grid-3 mt-12 stagger-reveal">
${cardsHtml}
    </div>
  </div>
</section>`
}
