import type { Section, ProcessStep } from '../../types'
import { pageHref } from '../utils'

const ARROW_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`

export function renderProcess(section: Section, linkMode: 'static' | 'preview' = 'static'): string {
  const headline = section.fields['headline']?.value as string
  const steps = section.fields['steps']?.value as ProcessStep[]

  const procesHref = pageHref('proces', linkMode)

  const stepsHtml = steps.map(step => `
      <li class="process-group group">
        <div class="process-step">
          <span class="process-step-num glitch-hover" aria-hidden="true">${step.num}</span>
          <div>
            <p class="process-step-title">${step.title}</p>
            <p class="process-step-body">${step.body}</p>
          </div>
        </div>
      </li>`).join('\n')

  return `<!-- SEKCJA: proces -->
<section id="process" class="section bg-surface reveal" aria-labelledby="process-heading">
  <div class="container">
    <div class="section-header">
      <span class="section-label">Jak pracuję</span>
      <h2 id="process-heading" class="f-headline">${headline}</h2>
    </div>

    <ol class="process-list-wrapper stagger-reveal" aria-label="Etapy procesu">
${stepsHtml}
    </ol>

    <a href="${procesHref}" class="section-cta-link mt-10"
      aria-label="Przejdź do pełnego opisu procesu i cennika">
      Pełny opis procesu
      ${ARROW_ICON}
    </a>
  </div>
</section>`
}
