import type { Section } from '../../types'
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

export function renderKontaktFormularz(section: Section, linkMode: 'static' | 'preview' = 'static'): string {
  const emailDisplay = section.fields['emailDisplay']?.value as string
  const emailHref = section.fields['emailHref']?.value as string
  const phoneRaw = section.fields['phoneRaw']?.value as string
  const phoneDisplay = section.fields['phoneDisplay']?.value as string

  return `<!-- SEKCJA: formularz i dane kontaktowe -->
<section class="section bg-surface" id="formularz" aria-labelledby="formularz-heading">
  <div class="container">
    <div class="contact-inner">

      <!-- Formularz -->
      <div class="reveal">
        <h2 id="formularz-heading" class="f-headline mb-5">Napisz do mnie</h2>
        <form class="form" action="#" method="post" novalidate aria-label="Formularz kontaktowy">

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

          <div class="form-group">
            <label class="form-label" for="budzet">
              Orientacyjny budżet <span aria-hidden="true">*</span>
              <span class="visually-hidden">(wymagane)</span>
            </label>
            <select
              class="form-input form-select"
              id="budzet"
              name="budzet"
              required
              aria-required="true">
              <option value="" disabled selected>Wybierz przedział</option>
              <option value="do-5000">Do 5 000 zł netto (Standard)</option>
              <option value="5000-8000">5 000–8 000 zł netto (Rozszerzony)</option>
              <option value="powyzej-8000">Powyżej 8 000 zł netto (Projekt niestandardowy)</option>
              <option value="nie-wiem">Nie wiem jeszcze — potrzebuję doradztwa</option>
            </select>
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
              Zapoznałem/am się z <a href="${pageHref('privacy-policy', linkMode)}">Polityką Prywatności</a>. <span aria-hidden="true">*</span>
            </label>
          </div>

          <div class="form-submit-group">
            <button type="submit" class="btn-primary btn-shimmer btn-pulse w-full" aria-label="Wyślij wiadomość">
              Wyślij wiadomość
            </button>
            <p class="btn-micro">Odpowiadam w ciągu 24h. Bez zobowiązań.</p>
          </div>

        </form>
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
              <a href="${emailHref}" class="contact-info-value" aria-label="Napisz na adres ${emailDisplay}">
                ${emailDisplay}
              </a>
            </div>
          </div>

          <div class="contact-info-item">
            <span class="contact-info-icon" aria-hidden="true">
              ${PHONE_SVG}
            </span>
            <div>
              <span class="contact-info-label">Telefon</span>
              <a href="tel:${phoneRaw}" class="contact-info-value" aria-label="Zadzwoń pod numer ${phoneDisplay}">
                ${phoneDisplay}
              </a>
            </div>
          </div>

          <div class="contact-info-item">
            <span class="contact-info-icon" aria-hidden="true">
              ${CLOCK_SVG}
            </span>
            <div>
              <span class="contact-info-label">Godziny odpowiedzi</span>
              <span class="contact-info-value">Pn–Pt, 9:00–17:00</span>
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
              <span class="reassurance-text">Odpowiadam osobiście — bez automatycznych odpowiedzi</span>
            </li>
            <li class="reassurance-item">
              <span class="reassurance-icon" aria-hidden="true">
                ${CHECK_SVG}
              </span>
              <span class="reassurance-text">Wstępna wycena bezpłatnie, w ciągu 24 godzin</span>
            </li>
            <li class="reassurance-item">
              <span class="reassurance-icon" aria-hidden="true">
                ${CHECK_SVG}
              </span>
              <span class="reassurance-text">Specjalizuję się wyłącznie w stronach dla kancelarii prawnych</span>
            </li>
          </ul>
        </div>

      </aside>

    </div>
  </div>
</section>`
}
