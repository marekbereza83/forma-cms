/**
 * Renderery sekcji dla stron prawnych.
 * Treść jest hardcoded — nie pochodzi z pól CMS (klient nie edytuje prawa).
 * Dane kontaktowe (email, telefon) pobierane z ctx.contactEmail / ctx.contactPhone
 * żeby zmiana w panelu propagowała automatycznie.
 * Sygnatury zgodne z SECTION_REGISTRY: (s: Section, ctx: RenderContext) => string.
 */
import type { Section } from '../../types'
import type { RenderContext } from '../context'

export function renderLegalNotice(_s: Section, ctx: RenderContext): string {
  return `<!-- SEKCJA: nota prawna -->
<section class="section" id="legal-notice" aria-labelledby="legal-heading">
  <div class="container">
    <div class="legal-content">

      <h1 id="legal-heading" class="f-headline">Nota Prawna</h1>
      <p class="f-label">Ostatnia aktualizacja: 20 maja 2026</p>

      <h2>1. Podmiot prowadzący serwis</h2>
      <dl class="legal-dl">
        <dt>Nazwa podmiotu</dt>
        <dd>Forma Wizerunku — Marek Bereza</dd>
        <dt>Forma działalności</dt>
        <dd>Działalność gospodarcza osoby fizycznej</dd>
        <dt>Adres e-mail</dt>
        <dd><a href="mailto:${ctx.contactEmail}">${ctx.contactEmail}</a></dd>
        <dt>Telefon</dt>
        <dd><a href="tel:${ctx.contactPhone}">${ctx.contactPhoneDisplay}</a></dd>
        <dt>Adres serwisu</dt>
        <dd><a href="https://www.formawizerunku.pl">https://www.formawizerunku.pl</a></dd>
      </dl>

      <h2>2. Prawa autorskie</h2>
      <p>
        Wszelkie treści zamieszczone w serwisie formawizerunku.pl — w tym teksty, grafiki,
        elementy interfejsu, logotypy i kod źródłowy — stanowią własność Forma Wizerunku
        lub zostały umieszczone za zgodą ich właścicieli i są chronione przepisami ustawy
        z dnia 4 lutego 1994 r. o prawie autorskim i prawach pokrewnych (Dz.U. z 2022 r.
        poz. 2509 ze zm.).
      </p>
      <p>
        Kopiowanie, reprodukowanie, modyfikowanie lub rozpowszechnianie jakichkolwiek
        elementów serwisu bez uprzedniej pisemnej zgody Forma Wizerunku jest zabronione,
        z wyjątkiem przypadków dozwolonego użytku osobistego przewidzianych przez prawo.
      </p>

      <h2>3. Linki zewnętrzne</h2>
      <p>
        Serwis może zawierać odnośniki do zewnętrznych stron internetowych. Forma Wizerunku
        nie ponosi odpowiedzialności za treść, aktualność ani politykę prywatności stron
        zewnętrznych. Korzystanie z tych stron odbywa się na własną odpowiedzialność
        użytkownika.
      </p>

      <h2>4. Charakter treści</h2>
      <p>
        Informacje zamieszczone w serwisie mają charakter wyłącznie informacyjny i promocyjny.
        Nie stanowią one oferty w rozumieniu Kodeksu cywilnego, chyba że wyraźnie zaznaczono
        inaczej. Forma Wizerunku zastrzega sobie prawo do zmiany cen, zakresu usług oraz
        treści serwisu bez uprzedniego powiadomienia.
      </p>

      <h2>5. Ograniczenie odpowiedzialności</h2>
      <p>
        Forma Wizerunku dokłada wszelkich starań, by informacje zawarte w serwisie były
        rzetelne i aktualne, jednak nie gwarantuje ich kompletności ani dokładności.
        W szczególności Forma Wizerunku nie ponosi odpowiedzialności za decyzje podjęte
        na podstawie treści dostępnych w serwisie.
      </p>

      <h2>6. Prawo właściwe</h2>
      <p>
        Niniejsza Nota Prawna podlega prawu polskiemu. Wszelkie spory wynikające
        z korzystania z serwisu będą rozstrzygane przez sądy właściwe zgodnie
        z obowiązującymi przepisami polskiego prawa.
      </p>

    </div>
  </div>
</section>`
}

export function renderTermsOfService(_s: Section, ctx: RenderContext): string {
  return `<!-- SEKCJA: regulamin serwisu -->
<section class="section" id="terms-of-service" aria-labelledby="terms-heading">
  <div class="container">
    <div class="legal-content">

      <h1 id="terms-heading" class="f-headline">Regulamin Serwisu</h1>
      <p class="f-label">Ostatnia aktualizacja: 12 czerwca 2026</p>

      <h2>1. Postanowienia ogólne</h2>
      <p>
        Niniejszy Regulamin określa zasady korzystania z serwisu internetowego
        dostępnego pod adresem <a href="https://www.formawizerunku.pl">formawizerunku.pl</a>,
        prowadzonego przez Marka Berezę prowadzącego działalność gospodarczą pod nazwą
        Forma Wizerunku (zwanego dalej „Usługodawcą").
      </p>
      <p>
        Korzystanie z serwisu oznacza akceptację niniejszego Regulaminu. Jeżeli nie
        akceptujesz jego postanowień, prosimy o opuszczenie serwisu.
      </p>

      <h2>2. Definicje</h2>
      <dl class="legal-dl">
        <dt>Serwis</dt>
        <dd>
          Witryna internetowa dostępna pod adresem formawizerunku.pl wraz ze
          wszystkimi podstronami i zasobami.
        </dd>
        <dt>Użytkownik</dt>
        <dd>
          Każda osoba fizyczna, która korzysta z Serwisu.
        </dd>
        <dt>Usługodawca</dt>
        <dd>
          Marek Bereza prowadzący działalność gospodarczą pod nazwą Forma Wizerunku,
          kontakt: <a href="mailto:${ctx.contactEmail}">${ctx.contactEmail}</a>,
          tel. <a href="tel:${ctx.contactPhone}">${ctx.contactPhoneDisplay}</a>.
        </dd>
        <dt>Usługi</dt>
        <dd>
          Projektowanie i wdrażanie stron internetowych oraz powiązane usługi
          świadczone przez Usługodawcę na rzecz Klientów.
        </dd>
      </dl>

      <h2>3. Rodzaj i zakres usług</h2>
      <p>
        Serwis ma charakter informacyjno-prezentacyjny. Usługodawca prezentuje za
        jego pośrednictwem swoje usługi projektowania stron internetowych, portfolio
        zrealizowanych projektów oraz informacje kontaktowe umożliwiające nawiązanie
        współpracy.
      </p>
      <p>
        Serwis udostępnia formularz kontaktowy służący do przesyłania zapytań
        ofertowych. Przesłanie formularza nie stanowi zawarcia umowy ani złożenia
        zamówienia — jest jedynie zaproszeniem do nawiązania kontaktu.
      </p>

      <h2>4. Warunki korzystania z serwisu</h2>
      <p>Użytkownik zobowiązuje się do:</p>
      <ul>
        <li>korzystania z Serwisu zgodnie z obowiązującymi przepisami prawa,</li>
        <li>niepodejmowania działań mogących naruszyć prawa Usługodawcy lub osób trzecich,</li>
        <li>nieprzesyłania za pośrednictwem formularza kontaktowego treści bezprawnych,
          obraźliwych, spamowych ani złośliwego oprogramowania.</li>
      </ul>
      <p>
        Usługodawca zastrzega sobie prawo do zablokowania dostępu do Serwisu
        Użytkownikom naruszającym postanowienia niniejszego Regulaminu.
      </p>

      <h2>5. Własność intelektualna</h2>
      <p>
        Wszelkie treści zamieszczone w Serwisie — w tym teksty, grafiki, elementy
        interfejsu, logotypy i kod źródłowy — są chronione przepisami prawa
        autorskiego i stanowią własność Usługodawcy lub zostały umieszczone za zgodą
        ich właścicieli.
      </p>
      <p>
        Bez uprzedniej pisemnej zgody Usługodawcy zabronione jest kopiowanie,
        reprodukowanie, modyfikowanie lub rozpowszechnianie jakichkolwiek elementów
        Serwisu, z wyjątkiem przypadków dozwolonego użytku osobistego.
      </p>

      <h2>6. Odpowiedzialność</h2>
      <p>
        Usługodawca dokłada wszelkich starań, by informacje zawarte w Serwisie były
        rzetelne i aktualne, jednak nie gwarantuje ich kompletności ani dokładności.
        Usługodawca nie ponosi odpowiedzialności za decyzje podjęte na podstawie
        treści dostępnych w Serwisie ani za szkody wynikające z niedostępności Serwisu.
      </p>
      <p>
        Usługodawca nie ponosi odpowiedzialności za treść zewnętrznych stron
        internetowych, do których odsyłają linki zamieszczone w Serwisie.
      </p>

      <h2>7. Dostępność serwisu</h2>
      <p>
        Usługodawca dąży do zapewnienia ciągłości działania Serwisu, jednak zastrzega
        sobie prawo do czasowego wyłączenia lub ograniczenia dostępu do Serwisu —
        w szczególności w celach konserwacyjnych — bez uprzedniego powiadomienia.
      </p>

      <h2>8. Ochrona danych osobowych</h2>
      <p>
        Zasady przetwarzania danych osobowych Użytkowników zostały szczegółowo opisane
        w <a href="privacy-policy.html">Polityce Prywatności</a>, która stanowi
        integralną część niniejszego Regulaminu.
      </p>

      <h2>9. Zmiany Regulaminu</h2>
      <p>
        Usługodawca zastrzega sobie prawo do zmiany niniejszego Regulaminu.
        Wszelkie zmiany będą publikowane na tej stronie wraz z nową datą aktualizacji.
        Korzystanie z Serwisu po wprowadzeniu zmian oznacza ich akceptację.
      </p>

      <h2>10. Prawo właściwe i rozstrzyganie sporów</h2>
      <p>
        Niniejszy Regulamin podlega prawu polskiemu. Wszelkie spory wynikające
        z korzystania z Serwisu strony będą starały się rozwiązać polubownie.
        W przypadku braku porozumienia sprawy będą rozstrzygane przez sąd właściwy
        miejscowo zgodnie z obowiązującymi przepisami polskiego prawa.
      </p>

      <h2>11. Kontakt</h2>
      <p>
        W sprawach dotyczących Regulaminu prosimy o kontakt pod adresem:
        <a href="mailto:${ctx.contactEmail}">${ctx.contactEmail}</a>.
      </p>

    </div>
  </div>
</section>`
}

export function renderPrivacyPolicy(_s: Section, ctx: RenderContext): string {
  return `<!-- SEKCJA: polityka prywatności -->
<section class="section" id="privacy-policy" aria-labelledby="privacy-heading">
  <div class="container">
    <div class="legal-content">

      <h1 id="privacy-heading" class="f-headline">Polityka Prywatności</h1>
      <p class="f-label">Ostatnia aktualizacja: 12 czerwca 2026</p>

      <h2>1. Administrator danych</h2>
      <p>
        Administratorem danych osobowych jest Marek Bereza prowadzący działalność
        pod nazwą Forma Wizerunku, kontakt:
        <a href="mailto:${ctx.contactEmail}">${ctx.contactEmail}</a>,
        tel. <a href="tel:${ctx.contactPhone}">${ctx.contactPhoneDisplay}</a>.
        W sprawach dotyczących ochrony danych prosimy o kontakt pod powyższy adres e-mail.
      </p>

      <h2>2. Cel i podstawa przetwarzania danych</h2>
      <p>
        Dane osobowe zbierane za pośrednictwem formularza kontaktowego (imię i nazwisko, adres
        e-mail, numer telefonu, adres strony internetowej, treść wiadomości) przetwarzane są
        wyłącznie w celu udzielenia odpowiedzi na przesłaną wiadomość oraz ewentualnego
        nawiązania współpracy.
      </p>
      <p>
        Podstawą prawną przetwarzania jest zgoda osoby, której dane dotyczą (art. 6 ust. 1
        lit. a RODO), a w przypadku zawarcia i realizacji umowy — art. 6 ust. 1 lit. b RODO.
      </p>

      <h2>3. Odbiorcy danych</h2>
      <p>
        Dane osobowe nie są sprzedawane ani przekazywane podmiotom trzecim w celach
        marketingowych. Mogą być udostępniane wyłącznie podmiotom przetwarzającym dane
        w imieniu Administratora, wyłącznie w zakresie niezbędnym do realizacji usług:
      </p>
      <ul>
        <li>
          <strong>Formspree, Inc.</strong> (formspree.io) — dostawca usługi obsługi
          formularza kontaktowego z siedzibą w USA. Dane przesłane formularzem
          (imię i nazwisko, e-mail, telefon, treść wiadomości) trafiają na serwery
          Formspree i są stamtąd przekazywane Administratorowi. Formspree działa jako
          podmiot przetwarzający na podstawie umowy powierzenia. Polityka prywatności
          Formspree: <a href="https://formspree.io/legal/privacy-policy" rel="noopener noreferrer" target="_blank">formspree.io/legal/privacy-policy</a>.
          Transfer danych do USA odbywa się na podstawie standardowych klauzul umownych
          (SCC) zatwierdzonych przez Komisję Europejską.
        </li>
        <li>
          <strong>Google LLC</strong> — dostawca usługi Google Fonts (czcionki używane
          w serwisie). Szczegóły w sekcji 7 poniżej.
        </li>
        <li>
          <strong>Vercel, Inc.</strong> — dostawca hostingu serwisu formawizerunku.pl.
          Logi dostępu (adres IP, nagłówki HTTP) mogą być przetwarzane przez Vercel
          na serwerach w UE lub USA. Polityka prywatności Vercel:
          <a href="https://vercel.com/legal/privacy-policy" rel="noopener noreferrer" target="_blank">vercel.com/legal/privacy-policy</a>.
        </li>
      </ul>

      <h2>4. Okres przechowywania danych</h2>
      <p>
        Dane przetwarzane na podstawie zgody przechowywane są do momentu jej wycofania
        lub do czasu, gdy stają się zbędne do realizacji celu, w którym zostały zebrane.
        Dane związane z realizacją umowy przechowywane są przez czas trwania umowy oraz
        przez okres wynikający z przepisów prawa (w szczególności przepisów podatkowych
        i rachunkowych — co do zasady 5 lat od końca roku podatkowego).
      </p>

      <h2>5. Prawa osób, których dane dotyczą</h2>
      <p>Przysługują Ci następujące prawa:</p>
      <ul>
        <li>prawo dostępu do swoich danych oraz otrzymania ich kopii,</li>
        <li>prawo do sprostowania (poprawiania) swoich danych,</li>
        <li>prawo do usunięcia danych (tzw. „prawo do bycia zapomnianym"),</li>
        <li>prawo do ograniczenia przetwarzania danych,</li>
        <li>prawo do przenoszenia danych,</li>
        <li>prawo do wniesienia sprzeciwu wobec przetwarzania danych,</li>
        <li>prawo do wycofania zgody w dowolnym momencie (bez wpływu na zgodność
          z prawem przetwarzania, którego dokonano przed jej wycofaniem),</li>
        <li>prawo do wniesienia skargi do organu nadzorczego — Prezesa Urzędu Ochrony
          Danych Osobowych (UODO), ul. Stawki 2, 00-193 Warszawa.</li>
      </ul>
      <p>
        W celu skorzystania z powyższych praw skontaktuj się z Administratorem pod adresem
        <a href="mailto:${ctx.contactEmail}">${ctx.contactEmail}</a>.
      </p>

      <h2>6. Pliki cookies</h2>
      <p>
        Serwis formawizerunku.pl korzysta z narzędzia Google Analytics 4 (dostawca: Google LLC)
        w celu analizy ruchu i sposobu korzystania ze strony. Narzędzie to wykorzystuje pliki
        cookies oraz zbiera dane takie jak adres IP (w formie skróconej), informacje o urządzeniu
        i przeglądarce oraz odwiedzanych podstronach.
      </p>
      <p>
        Cookies analityczne są instalowane wyłącznie po wyrażeniu przez Ciebie zgody za
        pośrednictwem banera pojawiającego się przy pierwszej wizycie. Do czasu wyrażenia zgody
        Google Analytics działa w trybie ograniczonym (Consent Mode) i nie zapisuje plików cookies.
        Podstawą prawną przetwarzania jest Twoja zgoda (art. 6 ust. 1 lit. a RODO), którą możesz
        w każdej chwili wycofać, usuwając pliki cookies w ustawieniach przeglądarki — kolejna
        wizyta ponownie wyświetli baner z możliwością wyboru.
      </p>
      <p>
        Pliki cookies niezbędne do prawidłowego działania serwisu nie wymagają zgody i nie służą
        do śledzenia ani profilowania.
      </p>

      <h2>7. Zewnętrzne usługi</h2>
      <p>
        Serwis korzysta z usług Google Fonts (dostarczanie czcionek) oraz Google Analytics
        (analityka), świadczonych przez Google LLC. Korzystanie z tych usług może wiązać się
        z przesyłaniem danych do serwerów Google. Informacje o przetwarzaniu danych przez Google
        dostępne są w Polityce Prywatności Google: <a href="https://policies.google.com/privacy" rel="noopener noreferrer" target="_blank">policies.google.com/privacy</a>.
      </p>

      <h2>8. Zmiany Polityki Prywatności</h2>
      <p>
        Administrator zastrzega sobie prawo do zmiany niniejszej Polityki Prywatności.
        Wszelkie zmiany będą publikowane na tej stronie wraz z nową datą aktualizacji.
        Zachęcamy do regularnego zapoznawania się z treścią Polityki Prywatności.
      </p>

    </div>
  </div>
</section>`
}
