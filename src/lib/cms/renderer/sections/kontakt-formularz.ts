import type { Section } from '../../types'
import type { RenderContext } from '../context'
import { pageHref } from '../utils'

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
  const r1 = section.fields['reassurance1']?.value as string ?? 'Odpowiadam osobiście — bez automatycznych odpowiedzi'
  const r2 = section.fields['reassurance2']?.value as string ?? 'Wstępna wycena bezpłatnie, w ciągu 24 godzin'
  const r3 = section.fields['reassurance3']?.value as string ?? 'Specjalizuję się wyłącznie w stronach dla kancelarii prawnych'

  return `<!-- SEKCJA: formularz i dane kontaktowe -->
<section class="section bg-surface" id="formularz" aria-labelledby="formularz-heading">
  <div class="container">
    <div class="contact-inner">

      <!-- Formularz -->
      <div class="reveal">
        <h2 id="formularz-heading" class="f-headline mb-5">Napisz do mnie</h2>
        <form class="form" action="https://formspree.io/f/xaqzdazj" method="POST" novalidate aria-label="Formularz kontaktowy">

          <div class="form-group">
            <label class="form-label" for="imie-nazwisko">
              Imię i nazwisko <span aria-hidden="true">*</span>
              <span class="visually-hidden">(wymagane)</span>
            </label>
            <input
              class="form-input"
              type="text"
              id="imie-nazwisko"
              name="imie-nazwisko"
              autocomplete="name"
              required
              aria-required="true"
              placeholder="np. Anna Kowalska">
          </div>

          <div class="form-group">
            <label class="form-label" for="email">
              Adres e-mail <span aria-hidden="true">*</span>
              <span class="visually-hidden">(wymagane)</span>
            </label>
            <input
              class="form-input"
              type="email"
              id="email"
              name="email"
              autocomplete="email"
              required
              aria-required="true"
              placeholder="np. anna@kancelaria.pl">
          </div>

          <div class="form-group">
            <label class="form-label" for="telefon">
              Numer telefonu
              <span class="form-optional">(opcjonalne)</span>
            </label>
            <input
              class="form-input"
              type="tel"
              id="telefon"
              name="telefon"
              autocomplete="tel"
              placeholder="np. +48 500 100 200">
          </div>

          <div class="form-group">
            <label class="form-label" for="url-strony">
              Adres obecnej strony
              <span class="form-optional">(opcjonalne)</span>
            </label>
            <input
              class="form-input"
              type="url"
              id="url-strony"
              name="url-strony"
              autocomplete="url"
              placeholder="np. https://twoja-kancelaria.pl">
          </div>

          <div class="form-group">
            <label class="form-label" for="opis">
              Opisz swój projekt <span aria-hidden="true">*</span>
              <span class="visually-hidden">(wymagane)</span>
            </label>
            <textarea
              class="form-input form-textarea"
              id="opis"
              name="opis"
              rows="5"
              required
              aria-required="true"
              placeholder="Czym zajmuje się Twoja kancelaria? Jakie masz oczekiwania wobec nowej strony? Co nie działa w obecnej? Nie musisz wiedzieć wszystkiego — po prostu opisz sytuację."></textarea>
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
              Wyrażam zgodę na przetwarzanie moich danych osobowych przez Forma Wizerunku
              w celu udzielenia odpowiedzi na wiadomość. Dane nie będą przekazywane
              podmiotom trzecim. Mogę wycofać zgodę w dowolnym momencie.
              Zapoznałem/am się z <a href="${pageHref('privacy-policy', ctx.linkMode)}">Polityką Prywatności</a>. <span aria-hidden="true">*</span>
            </label>
          </div>

          <div class="form-submit-group">
            <button type="submit" class="btn-primary btn-shimmer btn-pulse w-full" aria-label="Wyślij wiadomość">
              Wyślij wiadomość
            </button>
            <p class="btn-micro">Odpowiadam w ciągu 24h. Bez zobowiązań.</p>
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
                    + '<h3 class="form-success-title">Dziękuję za wiadomość!</h3>'
                    + '<p class="form-success-body">Odezwę się w możliwie najszybszym czasie.</p>'
                    + '<a href="' + homeHref + '" class="btn-primary mt-6" style="display:inline-block">Wróć na stronę główną</a>'
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
      <aside class="reveal" aria-label="Bezpośrednie dane kontaktowe">
        <h2 class="f-headline mb-5">Dane kontaktowe</h2>
        <div class="contact-info">

          <div class="contact-info-item">
            <span class="contact-info-icon" aria-hidden="true">
              ${EMAIL_SVG}
            </span>
            <div>
              <span class="contact-info-label">E-mail</span>
              <a href="${ctx.contactEmailHref}" class="contact-info-value" aria-label="Napisz na adres ${ctx.contactEmail}">
                ${ctx.contactEmail}
              </a>
            </div>
          </div>

          <div class="contact-info-item">
            <span class="contact-info-icon" aria-hidden="true">
              ${PHONE_SVG}
            </span>
            <div>
              <span class="contact-info-label">Telefon</span>
              <a href="tel:${ctx.contactPhone}" class="contact-info-value" aria-label="Zadzwoń pod numer ${ctx.contactPhoneDisplay}">
                ${ctx.contactPhoneDisplay}
              </a>
            </div>
          </div>

        </div>

        <div class="mt-10">
          <p class="f-label mb-3">Dlaczego warto napisać</p>
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
