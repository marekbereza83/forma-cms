export const redesignAnimatorScript = `<!-- redesign-animator Web Component -->
<script>
(function() {
  'use strict';
  const stages = [
    {
      label: '01 Stan Zastany',
      desc:  'Analiza obecnej strony kancelarii.',
      html: '<div class="ra-stage ra-stage--old"><div class="ra-label-top">Strona kancelarii — stan obecny</div><div class="ra-bars"><div class="ra-bar ra-bar--bad ra-bar--35"></div><div class="ra-bar ra-bar--bad ra-bar--22"></div><div class="ra-bar ra-bar--bad ra-bar--50"></div></div><div class="ra-label-bot ra-label-bot--danger">COPYRIGHT 2017 &bull; NO HTTPS &bull; 4.2s LOAD</div></div>'
    },
    {
      label: '02 Audyt',
      desc:  'Mapowanie architektury zaufania.',
      html: '<div class="ra-stage ra-stage--audit"><div class="ra-label-top">Skanowanie węzłów zaufania</div><div class="ra-spinners"><div class="ra-spinner-row"><div class="ra-spinner"></div><div class="ra-progress"><div class="ra-fill ra-fill--70"></div></div></div><div class="ra-spinner-row"><div class="ra-spinner ra-spinner--slow"></div><div class="ra-progress"><div class="ra-fill ra-fill--45"></div></div></div></div><div class="ra-label-bot">ANALIZA TREŚCI &bull; CTA MAPPING &bull; SEO AUDIT</div></div>'
    },
    {
      label: '03 PACTA',
      desc:  'Aktywacja protokołu eksperckiego.',
      html: '<div class="ra-stage ra-stage--pacta"><div class="ra-pacta-title">PACTA</div><div class="ra-label-bot ra-label-bot--muted">SYSTEM AKTYWNY &bull; ZAUFANIE POTWIERDZONE</div></div>'
    },
    {
      label: '04 Wdrożenie',
      desc:  'Gotowa strona. Lighthouse 95+.',
      html: '<div class="ra-stage ra-stage--done"><div class="ra-scores"><div class="ra-score"><span class="ra-score-num">95</span><div class="ra-score-bar"></div><span class="ra-score-lbl">PERF</span></div><div class="ra-score"><span class="ra-score-num">97</span><div class="ra-score-bar"></div><span class="ra-score-lbl">A11Y</span></div><div class="ra-score"><span class="ra-score-num">100</span><div class="ra-score-bar"></div><span class="ra-score-lbl">SEO</span></div><div class="ra-score"><span class="ra-score-num">98</span><div class="ra-score-bar"></div><span class="ra-score-lbl">BP</span></div></div><div class="ra-label-bot ra-label-bot--success">DOSTAWA: 12 DNI &bull; LIGHTHOUSE &#10003;</div></div>'
    }
  ];

  const CSS = \`
    :host{display:block;width:100%;height:100%;font-family:'Plus Jakarta Sans',sans-serif;color:#F0F6FC}
    .wrap{height:100%;display:flex;flex-direction:column;gap:.75rem;padding:1rem;box-sizing:border-box}
    .content{flex:1;min-height:0;transition:opacity .35s ease}
    .meta{border-top:1px solid #21262D;padding-top:.75rem;display:flex;justify-content:space-between;align-items:flex-end}
    .info{display:flex;flex-direction:column;gap:.15rem}
    .label{font-weight:800;font-size:.9rem;letter-spacing:-.02em}
    .desc{color:#8B949E;font-size:.75rem}
    .numeral{font-family:'Space Mono',monospace;color:#6366F1;font-weight:700;font-size:.75rem}
    .dots{display:flex;gap:.4rem;align-items:center;margin-bottom:.25rem}
    .dot{width:7px;height:7px;border-radius:50%;cursor:pointer;border:none;padding:0;transition:background .2s,transform .2s;background:rgba(99,102,241,0.2)}
    .dot.active{background:#6366F1}
    .dot:hover{transform:scale(1.4)}
    .dot:focus-visible{outline:2px solid #6366F1;outline-offset:2px}
    .ra-stage{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;padding:1.25rem;background:#0D1117;border:1px solid #21262D;border-radius:6px;box-sizing:border-box}
    .ra-stage--pacta{border-color:rgba(99,102,241,.25);box-shadow:0 0 40px -10px rgba(99,102,241,.12)}
    .ra-label-top{font-family:'Space Mono',monospace;font-size:.65rem;color:#484F58;letter-spacing:.1em;text-transform:uppercase;text-align:center}
    .ra-label-bot{font-family:'Space Mono',monospace;font-size:.6rem;color:#8B949E;text-align:center;letter-spacing:.06em}
    .ra-label-bot--danger{color:#F85149;opacity:.7}
    .ra-label-bot--muted{color:rgba(129,140,248,.7)}
    .ra-label-bot--success{color:#3FB950;opacity:.85}
    .ra-bars{display:flex;flex-direction:column;gap:.4rem;width:100%;max-width:220px}
    .ra-bar{height:6px;border-radius:2px;background:#161B22;overflow:hidden;position:relative}
    .ra-bar::after{content:'';position:absolute;top:0;left:0;height:100%;border-radius:2px;background:#F85149;opacity:.45}
    .ra-bar--35::after{width:35%}.ra-bar--22::after{width:22%}.ra-bar--50::after{width:50%}
    .ra-spinners{display:flex;flex-direction:column;gap:.6rem;width:100%;max-width:220px}
    .ra-spinner-row{display:flex;align-items:center;gap:.5rem}
    .ra-spinner{width:22px;height:22px;border-radius:50%;border:2px solid #21262D;border-top-color:#6366F1;animation:spin 1s linear infinite;flex-shrink:0}
    .ra-spinner--slow{animation-duration:1.5s}
    .ra-progress{height:5px;flex:1;background:#161B22;border-radius:2px;overflow:hidden}
    .ra-fill{height:100%;background:rgba(99,102,241,.5);border-radius:2px}
    .ra-fill--70{width:70%}.ra-fill--45{width:45%}
    .ra-pacta-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:2.5rem;font-weight:800;background:linear-gradient(135deg,#818cf8,#6366F1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-.04em;line-height:1}
    .ra-scores{display:flex;gap:.6rem;align-items:flex-end}
    .ra-score{display:flex;flex-direction:column;align-items:center;gap:.2rem}
    .ra-score-num{font-family:'Space Mono',monospace;font-size:1.1rem;font-weight:700;color:#3FB950}
    .ra-score-bar{width:28px;height:3px;background:#3FB950;border-radius:2px}
    .ra-score-lbl{font-family:'Space Mono',monospace;font-size:.55rem;color:#484F58;letter-spacing:.05em}
    @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  \`;

  class RedesignAnimator extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._index    = 0;
      this._interval = null;
    }

    connectedCallback() {
      this._render();
      this._bindDots();
      this._startInterval();
    }

    disconnectedCallback() {
      clearInterval(this._interval);
    }

    goTo(i) {
      this._index = i;
      this._updateContent();
    }

    _startInterval() {
      this._interval = setInterval(() => {
        this._index = (this._index + 1) % stages.length;
        this._updateContent();
      }, 4000);
    }

    _updateContent() {
      const s     = stages[this._index];
      const box   = this.shadowRoot.querySelector('.content');
      const label = this.shadowRoot.querySelector('.label');
      const desc  = this.shadowRoot.querySelector('.desc');
      const num   = this.shadowRoot.querySelector('.numeral');
      const dots  = this.shadowRoot.querySelectorAll('.dot');

      box.style.opacity = '0';
      setTimeout(() => {
        box.innerHTML   = s.html;
        label.textContent = s.label;
        desc.textContent  = s.desc;
        num.textContent   = '0' + (this._index + 1);
        dots.forEach((d, i) => {
          d.classList.toggle('active', i === this._index);
        });
        box.style.opacity = '1';
      }, 350);
    }

    _bindDots() {
      this.shadowRoot.querySelectorAll('.dot').forEach((dot, i) => {
        dot.addEventListener('click', () => {
          clearInterval(this._interval);
          this.goTo(i);
          this._startInterval();
        });
      });
    }

    _render() {
      const s = stages[0];
      const dotsHTML = stages.map((_, i) =>
        \`<button class="\${i===0?'dot active':'dot'}" aria-label="Faza \${i+1}: \${stages[i].label}"></button>\`
      ).join('');

      this.shadowRoot.innerHTML = \`
        <style>\${CSS}</style>
        <div class="wrap">
          <div class="content">\${s.html}</div>
          <div class="meta">
            <div class="info">
              <span class="label">\${s.label}</span>
              <span class="desc">\${s.desc}</span>
            </div>
            <div>
              <div class="dots">\${dotsHTML}</div>
              <span class="numeral">01</span>
            </div>
          </div>
        </div>
      \`;
    }
  }

  if (!customElements.get('redesign-animator')) {
    customElements.define('redesign-animator', RedesignAnimator);
  }
})();
</script>`
