/**
 * Baner zgody na cookies — wstrzykiwany tylko gdy model.meta.gaId jest ustawione.
 * Współpracuje z Consent Mode v2 z gaSnippet() w head.ts:
 *  - GA startuje z analytics_storage:'denied'
 *  - "Akceptuję" → localStorage 'granted' + gtag consent update granted
 *  - "Odrzucam"  → localStorage 'denied' (GA pozostaje zablokowane)
 * Wybór jest pamiętany — baner nie pokazuje się ponownie.
 *
 * privacyHref: rozwiązany link do polityki prywatności (zależny od linkMode).
 */
export function cookieConsentBanner(privacyHref: string): string {
  return `<!-- cookie-consent baner (RODO / Consent Mode v2) -->
<div id="cookie-consent" class="cookie-consent" role="dialog" aria-label="Zgoda na pliki cookie" aria-live="polite" hidden>
  <div class="cookie-consent-inner">
    <p class="cookie-consent-text">
      Używamy plików cookie Google Analytics, aby analizować ruch na stronie.
      Możesz je zaakceptować lub odrzucić. Szczegóły w <a href="${privacyHref}">Polityce Prywatności</a>.
    </p>
    <div class="cookie-consent-actions">
      <button type="button" class="btn-ghost" data-cookie-reject>Odrzucam</button>
      <button type="button" class="btn-primary" data-cookie-accept>Akceptuję</button>
    </div>
  </div>
</div>
<script>
(function(){
  'use strict';
  var KEY='forma-cookie-consent';
  var banner=document.getElementById('cookie-consent');
  if(!banner)return;
  var stored=null;
  try{stored=localStorage.getItem(KEY);}catch(e){}
  if(stored==='granted'||stored==='denied')return; // wybór już dokonany
  banner.hidden=false;
  function choose(val){
    try{localStorage.setItem(KEY,val);}catch(e){}
    if(val==='granted'&&typeof gtag==='function'){
      gtag('consent','update',{analytics_storage:'granted'});
    }
    banner.hidden=true;
  }
  var accept=banner.querySelector('[data-cookie-accept]');
  var reject=banner.querySelector('[data-cookie-reject]');
  if(accept)accept.addEventListener('click',function(){choose('granted');});
  if(reject)reject.addEventListener('click',function(){choose('denied');});
})();
</script>`
}
