export const redesignAnimatorScript = `<!-- redesign-animator Web Component -->
<script>
(function() {
  'use strict';
  const INTERVAL_MS = 5000;
  const stages = [
    {
      label: '01 Diagnoza',
      desc:  'Tak klienci widzą przestarzałą stronę.',
      html: '<div class="ra-stage ra-stage--old"><div class="ra-label-top">Strona kancelarii — stan obecny</div><div class="ra-bars"><div class="ra-bar ra-bar--bad ra-bar--35"></div><div class="ra-bar ra-bar--bad ra-bar--22"></div><div class="ra-bar ra-bar--bad ra-bar--50"></div></div><div class="ra-label-bot ra-label-bot--danger">COPYRIGHT 2017 &bull; BRAK HTTPS &bull; ŁADOWANIE 4.2s</div></div>'
    },
    {
      label: '02 Audyt',
      desc:  'Znajduję to, co odstrasza klientów.',
      html: '<div class="ra-stage ra-stage--audit"><div class="ra-label-top">Pełny audyt obecnej strony</div><div class="ra-spinners"><div class="ra-spinner-row"><div class="ra-spinner"></div><div class="ra-progress"><div class="ra-fill ra-fill--70"></div></div></div><div class="ra-spinner-row"><div class="ra-spinner ra-spinner--slow"></div><div class="ra-progress"><div class="ra-fill ra-fill--45"></div></div></div></div><div class="ra-label-bot">TREŚĆ &bull; UX &bull; SEO &bull; SZYBKOŚĆ</div></div>'
    },
    {
      label: '03 System PACTA',
      desc:  'Design, który buduje zaufanie do prawnika.',
      html: '<div class="ra-stage ra-stage--pacta"><div class="ra-pacta-title">PACTA</div><div class="ra-label-bot ra-label-bot--muted">SYSTEM AKTYWNY &bull; ZAUFANIE POTWIERDZONE</div></div>'
    },
    {
      label: '04 Wdrożenie',
      desc:  'Nowa strona gotowa w 14 dni.',
      html: '<div class="ra-stage ra-stage--done"><div class="ra-scores"><div class="ra-score"><span class="ra-score-num">95</span><div class="ra-score-bar"></div><span class="ra-score-lbl">PERF</span></div><div class="ra-score"><span class="ra-score-num">97</span><div class="ra-score-bar"></div><span class="ra-score-lbl">A11Y</span></div><div class="ra-score"><span class="ra-score-num">100</span><div class="ra-score-bar"></div><span class="ra-score-lbl">SEO</span></div><div class="ra-score"><span class="ra-score-num">98</span><div class="ra-score-bar"></div><span class="ra-score-lbl">BP</span></div></div><div class="ra-label-bot ra-label-bot--success">GOTOWE W 14 DNI &bull; LIGHTHOUSE &#10003;</div></div>'
    }
  ];

  const CSS = \`
    :host{display:block;width:100%;height:100%;font-family:'Plus Jakarta Sans',sans-serif;color:#F0F6FC}
    .wrap{height:100%;display:flex;flex-direction:column;gap:.75rem;padding:1.25rem;box-sizing:border-box}
    .content{flex:1;min-height:0;transition:opacity .3s ease,transform .3s ease;overflow:hidden}
    .content.switching{opacity:0;transform:translateY(8px)}
    .meta{border-top:1px solid #21262D;padding-top:.75rem;display:flex;justify-content:space-between;align-items:flex-end;gap:.75rem;flex-shrink:0}
    .info{display:flex;flex-direction:column;gap:.2rem;min-width:0;overflow:hidden}
    .label{font-weight:800;font-size:1rem;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .desc{color:#8B949E;font-size:.85rem;line-height:1.35;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
    .numeral{font-family:'Space Mono',monospace;color:#6366F1;font-weight:700;font-size:.9rem}
    .dots{display:flex;gap:.45rem;align-items:center;margin-bottom:.3rem;justify-content:flex-end}
    .dot{width:9px;height:9px;border-radius:5px;cursor:pointer;border:none;padding:0;position:relative;overflow:hidden;transition:background .2s,width .3s ease;background:rgba(99,102,241,0.2)}
    .dot.active{width:26px;background:rgba(99,102,241,0.25)}
    .dot.active::after{content:'';position:absolute;inset:0;background:#6366F1;transform-origin:left;animation:dotfill \${INTERVAL_MS}ms linear forwards}
    .paused .dot.active::after{animation-play-state:paused}
    .dot:hover{background:rgba(99,102,241,0.45)}
    .dot:focus-visible{outline:2px solid #6366F1;outline-offset:2px}
    .ra-stage{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.8rem;padding:1rem;background:#0D1117;border:1px solid #21262D;border-radius:6px;box-sizing:border-box;overflow:hidden}
    .ra-stage--pacta{border-color:rgba(99,102,241,.25);box-shadow:0 0 40px -10px rgba(99,102,241,.12)}
    .ra-label-top{font-family:'Space Mono',monospace;font-size:.78rem;color:#8B949E;letter-spacing:.1em;text-transform:uppercase;text-align:center}
    .ra-label-bot{font-family:'Space Mono',monospace;font-size:.75rem;color:#8B949E;text-align:center;letter-spacing:.06em}
    .ra-label-bot--danger{color:#F85149;opacity:.85}
    .ra-label-bot--muted{color:rgba(129,140,248,.85)}
    .ra-label-bot--success{color:#3FB950;opacity:.95}
    .ra-bars{display:flex;flex-direction:column;gap:.5rem;width:100%;max-width:240px}
    .ra-bar{height:8px;border-radius:2px;background:#161B22;overflow:hidden;position:relative}
    .ra-bar::after{content:'';position:absolute;top:0;left:0;height:100%;border-radius:2px;background:#F85149;opacity:.45}
    .ra-bar--35::after{width:35%}.ra-bar--22::after{width:22%}.ra-bar--50::after{width:50%}
    .ra-spinners{display:flex;flex-direction:column;gap:.7rem;width:100%;max-width:240px}
    .ra-spinner-row{display:flex;align-items:center;gap:.6rem}
    .ra-spinner{width:26px;height:26px;border-radius:50%;border:2px solid #21262D;border-top-color:#6366F1;animation:spin 1s linear infinite;flex-shrink:0}
    .ra-spinner--slow{animation-duration:1.5s}
    .ra-progress{height:7px;flex:1;background:#161B22;border-radius:2px;overflow:hidden}
    .ra-fill{height:100%;background:rgba(99,102,241,.5);border-radius:2px}
    .ra-fill--70{width:70%}.ra-fill--45{width:45%}
    .ra-pacta-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(2.2rem,5vw,3.5rem);font-weight:800;background:linear-gradient(135deg,#818cf8,#6366F1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-.04em;line-height:1}
    .ra-scores{display:flex;gap:.8rem;align-items:flex-end}
    .ra-score{display:flex;flex-direction:column;align-items:center;gap:.25rem}
    .ra-score-num{font-family:'Space Mono',monospace;font-size:1.5rem;font-weight:700;color:#3FB950}
    .ra-score-bar{width:36px;height:3px;background:#3FB950;border-radius:2px}
    .ra-score-lbl{font-family:'Space Mono',monospace;font-size:.7rem;color:#8B949E;letter-spacing:.05em}
    @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
    @keyframes dotfill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    @media (prefers-reduced-motion: reduce){
      .content,.dot{transition:none}
      .ra-spinner,.dot.active::after{animation:none}
      .dot.active::after{transform:scaleX(1)}
    }
  \`;

  class RedesignAnimator extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._index    = 0;
      this._interval = null;
      this._reduced  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    connectedCallback() {
      this._render();
      this._bindDots();
      this._bindPause();
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
      if (this._reduced) return;
      clearInterval(this._interval);
      this._interval = setInterval(() => {
        this._index = (this._index + 1) % stages.length;
        this._updateContent();
      }, INTERVAL_MS);
    }

    _updateContent() {
      const s     = stages[this._index];
      const box   = this.shadowRoot.querySelector('.content');
      const label = this.shadowRoot.querySelector('.label');
      const desc  = this.shadowRoot.querySelector('.desc');
      const num   = this.shadowRoot.querySelector('.numeral');

      box.classList.add('switching');
      setTimeout(() => {
        box.innerHTML   = s.html;
        label.textContent = s.label;
        desc.textContent  = s.desc;
        num.textContent   = '0' + (this._index + 1);
        this._setActiveDot();
        box.classList.remove('switching');
      }, 300);
    }

    _setActiveDot() {
      this.shadowRoot.querySelectorAll('.dot').forEach((d, i) => {
        d.classList.remove('active');
        if (i === this._index) {
          void d.offsetWidth; // restart the fill animation
          d.classList.add('active');
        }
      });
    }

    _bindDots() {
      this.shadowRoot.querySelectorAll('.dot').forEach((dot, i) => {
        dot.addEventListener('click', () => {
          this.goTo(i);
          this._startInterval();
        });
      });
    }

    _bindPause() {
      const wrap = this.shadowRoot.querySelector('.wrap');
      const pause = () => {
        clearInterval(this._interval);
        wrap.classList.add('paused');
      };
      const resume = () => {
        wrap.classList.remove('paused');
        this._setActiveDot();
        this._startInterval();
      };
      this.addEventListener('mouseenter', pause);
      this.addEventListener('mouseleave', resume);
      this.addEventListener('focusin', pause);
      this.addEventListener('focusout', resume);
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
