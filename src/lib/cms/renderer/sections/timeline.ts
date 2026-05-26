import type { Section, TimelineItem } from '../../types'

export function renderTimeline(section: Section): string {
  const headline = section.fields['headline']?.value as string
  const steps    = section.fields['steps']?.value as TimelineItem[]

  // NOTE: step.day uses ASCII hyphen (U+002D) — e.g. "Dzień 1-2".
  // Reference proces.html uses U+2013 en-dash which is banned by the fixture whitelist.
  // This is a conscious, deliberate difference — not accidental loss of fidelity.
  const stepsHtml = steps.map(step => `
      <li class="timeline-item group">
        <div class="timeline-num">
          <span class="timeline-num-inner f-numeral glitch-hover">${step.num}</span>
        </div>
        <div class="timeline-body">
          <span class="timeline-day">${step.day}</span>
          <p class="process-step-title">${step.title}</p>
          <p class="process-step-body">
            ${step.body}
          </p>
        </div>
      </li>`).join('\n')

  return `<!-- SEKCJA: timeline -->
<section id="timeline" class="section bg-base reveal" aria-labelledby="timeline-heading">
  <div class="container">
    <div class="section-header">
      <span class="section-label">Etapy</span>
      <h2 id="timeline-heading" class="f-headline">${headline}</h2>
    </div>

    <ol class="process-timeline stagger-reveal" aria-label="Etapy procesu z harmonogramem">
${stepsHtml}
    </ol>
  </div>
</section>`
}
