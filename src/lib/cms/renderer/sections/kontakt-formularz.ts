import type { Section } from '../../types'
import type { RenderContext } from '../context'
import { pageHref } from '../utils'
import { t } from '../i18n'

// EN tenant does not yet ship its own privacy-policy page (out of scope for v1) — cross-link
// to the existing Polish page on the main domain rather than a broken relative link.
function privacyPolicyHref(ctx: RenderContext): string {
  return ctx.lang === 'en' ? 'https://formawizerunku.pl/privacy-policy.html' : pageHref('privacy-policy', ctx.linkMode)
}

const EMAIL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round" aria-hidden="true" focusable="false">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>`

const PHONE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round" aria-hidden="true" focusable="false">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/>
                </svg>`

const CLOCK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round" aria-hidden="true" focusable="false">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>`

const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>`

export function renderKontaktFormularz(section: Section, ctx: RenderContext): string {
  const s = t(ctx.lang)
  const r1 = section.fields['reassurance1']?.value as string ?? s.kontaktFormularz.reassurance1Default
  const r2 = section.fields['reassurance2']?.value as string ?? s.kontaktFormularz.reassurance2Default
  const r3 = section.fields['reassurance3']?.value as string ?? s.kontaktFormularz.reassurance3Default

  return `<!-- SEKCJA: formularz i dane kontaktowe -->
<section class="section bg-surface" id="formularz" aria-labelledby="formularz-heading">
  <div class="container">
    <div class="contact-inner">

      <!-- Formularz -->
      <div class="reveal">
        <h2 id="formularz-heading" class="f-headline mb-5">${s.kontaktFormularz.formHeading}</h2>
        <form class="form" action="https://formspree.io/f/xaqzdazj" method="POST" novalidate aria-label="${s.kontaktFormularz.formAria}">

          <div class="form-group">
            <label class="form-label" for="imie-nazwisko">
              ${s.kontaktFormularz.nameLabel} <span aria-hidden="true">*</span>
              <span class="visually-hidden">${s.kontaktFormularz.required}</span>
            </label>
            <input
              class="form-input"
              type="text"
              id="imie-nazwisko"
              name="imie-nazwisko"
              autocomplete="name"
              required
              aria-required="true"
              placeholder="${s.kontaktFormularz.namePlaceholder}">
          </div>

          <div class="form-group">
            <label class="form-label" for="email">
              ${s.kontaktFormularz.emailLabel} <span aria-hidden="true">*</span>
              <span class="visually-hidden">${s.kontaktFormularz.required}</span>
            </label>
            <input
              class="form-input"
              type="email"
              id="email"
              name="email"
              autocomplete="email"
              required
              aria-required="true"
              placeholder="${s.kontaktFormularz.emailPlaceholder}">
          </div>

          <div class="form-group">
            <label class="form-label" for="telefon">
              ${s.kontaktFormularz.phoneLabel}
              <span class="form-optional">${s.kontaktFormularz.optional}</span>
            </label>
            <input
              class="form-input"
              type="tel"
              id="telefon"
              name="telefon"
              autocomplete="tel"
              placeholder="${s.kontaktFormularz.phonePlaceholder}">
          </div>

          <div class="form-group">
            <label class="form-label" for="url-strony">
              ${s.kontaktFormularz.urlLabel}
              <span class="form-optional">${s.kontaktFormularz.optional}</span>
            </label>
            <input
              class="form-input"
              type="url"
              id="url-strony"
              name="url-strony"
              autocomplete="url"
              placeholder="${s.kontaktFormularz.urlPlaceholder}">
          </div>

          <div class="form-group">
            <label class="form-label" for="opis">
              ${s.kontaktFormularz.projectLabel} <span aria-hidden="true">*</span>
              <span class="visually-hidden">${s.kontaktFormularz.required}</span>
            </label>
            <textarea
              class="form-input form-textarea"
              id="opis"
              name="opis"
              rows="5"
              required
              aria-required="true"
              placeholder="${s.kontaktFormularz.projectPlaceholder}"></textarea>
          </div>

          <div class="form-checkbox-group">
            <input
              class="form-checkbox"
              type="checkbox"
              id="rodo"
              name="rodo"
              required
              aria-required="true">
            <label class="form-checkbox-label" for="rodo">
              ${s.kontaktFormularz.rodoTextPrefix}<a href="${privacyPolicyHref(ctx)}">${s.kontaktFormularz.privacyPolicyLinkText}</a>${s.kontaktFormularz.rodoTextSuffix} <span aria-hidden="true">*</span>
            </label>
          </div>

          <div class="form-submit-group">
            <button type="submit" class="btn-primary btn-shimmer btn-pulse w-full" aria-label="${s.kontaktFormularz.submitLabel}">
              ${s.kontaktFormularz.submitLabel}
            </button>
            <p class="btn-micro">${s.kontaktFormularz.submitMicrocopy}</p>
          </div>

        </form>
        <script>
          (function () {
            var form = document.querySelector('form[action*="formspree.io"]');
            if (!form) return;
            form.addEventListener('submit', function (e) {
              e.preventDefault();
              var btn = form.querySelector('button[type="submit"]');
              if (btn) btn.disabled = true;
              fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { Accept: 'application/json' }
              }).then(function (r) {
                if (r.ok) {
                  var homeHref = '${pageHref('index', ctx.linkMode)}';
                  form.parentNode.innerHTML = '<div class="form-success" role="alert" aria-live="polite">'
                    + '<div class="form-success-icon" aria-hidden="true">&#10003;</div>'
                    + '<h3 class="form-success-title">${s.kontaktFormularz.successTitle}</h3>'
                    + '<p class="form-success-body">${s.kontaktFormularz.successBody}</p>'
                    + '<a href="' + homeHref + '" class="btn-primary mt-6">${s.kontaktFormularz.successBackHome}</a>'
                    + '</div>';
                } else {
                  if (btn) btn.disabled = false;
                }
              }).catch(function () {
                if (btn) btn.disabled = false;
              });
            });
          })();
        </script>
      </div>

      <!-- Dane kontaktowe -->
      <aside class="reveal" aria-label="${s.kontaktFormularz.contactInfoAria}">
        <h2 class="f-headline mb-5">${s.kontaktFormularz.contactInfoHeading}</h2>
        <div class="contact-info">

          <div class="contact-info-item">
            <span class="contact-info-icon" aria-hidden="true">
              ${EMAIL_SVG}
            </span>
            <div>
              <span class="contact-info-label">${s.kontaktFormularz.emailFieldLabel}</span>
              <a href="${ctx.contactEmailHref}" class="contact-info-value" aria-label="${s.shared.writeAtAddressAriaPrefix}${ctx.contactEmail}">
                ${ctx.contactEmail}
              </a>
            </div>
          </div>

          <div class="contact-info-item">
            <span class="contact-info-icon" aria-hidden="true">
              ${PHONE_SVG}
            </span>
            <div>
              <span class="contact-info-label">${s.kontaktFormularz.phoneFieldLabel}</span>
              <a href="tel:${ctx.contactPhone}" class="contact-info-value" aria-label="${s.shared.callAtNumberAriaPrefix}${ctx.contactPhoneDisplay}">
                ${ctx.contactPhoneDisplay}
              </a>
            </div>
          </div>

        </div>

        <div class="mt-10">
          <p class="f-label mb-3">${s.kontaktFormularz.whyWriteLabel}</p>
          <ul class="reassurance-list" role="list">
            <li class="reassurance-item">
              <span class="reassurance-icon" aria-hidden="true">
                ${CHECK_SVG}
              </span>
              <span class="reassurance-text">${r1}</span>
            </li>
            <li class="reassurance-item">
              <span class="reassurance-icon" aria-hidden="true">
                ${CHECK_SVG}
              </span>
              <span class="reassurance-text">${r2}</span>
            </li>
            <li class="reassurance-item">
              <span class="reassurance-icon" aria-hidden="true">
                ${CHECK_SVG}
              </span>
              <span class="reassurance-text">${r3}</span>
            </li>
          </ul>
        </div>

      </aside>

    </div>
  </div>
</section>`
}
