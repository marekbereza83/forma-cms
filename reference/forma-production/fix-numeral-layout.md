# Fix: numerale nakładają się na tekst — layout kolizja

## Diagnoza (przeczytaj zanim cokolwiek zmienisz)

Numer nakłada się na tekst bo grid-template-columns jest za wąskie
dla dużego font-size numeralu.

**design-system-agency.css:**
- `.process-step` ma `grid-template-columns: 2rem 1fr` — za wąskie
- `.process-step-num` ma `font-size: 0.8125rem` — stary mały rozmiar

**forma-layout.css:**
- `.timeline-item` ma `grid-template-columns: 3rem 1fr` — za wąskie
- `.timeline-num-inner` ma `font-size: 0.8125rem` — stary mały rozmiar

Numer został zwiększony w `--numeral-size` ale layout nie dostał więcej miejsca.

---

## Fix 1: design-system-agency.css

Znajdź i zamień:

```css
/* PRZED */
.process-step {
  display: grid;
  grid-template-columns: 2rem 1fr;
  gap: var(--space-4);
  align-items: start;
}

.process-step-num {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.04em;
  padding-top: 2px;
}
```

```css
/* PO */
.process-step {
  display: grid;
  grid-template-columns: 5.5rem 1fr;  /* szersze — mieści 4rem numeral */
  gap: var(--space-6);
  align-items: start;
}

.process-step-num {
  font-family: var(--font-mono);
  font-size: 4rem;           /* duży, graficzny element */
  font-weight: 700;
  color: var(--accent);
  letter-spacing: -0.02em;
  line-height: 1;
  display: block;
}
```

---

## Fix 2: forma-layout.css

Znajdź i zamień sekcję `.timeline-item` i `.timeline-num-inner`:

```css
/* PRZED */
.timeline-item {
  display: grid;
  grid-template-columns: 3rem 1fr;
  gap: var(--space-6);
  padding-block: var(--space-8);
  position: relative;
}

.timeline-num {
  display: flex;
  align-items: flex-start;
  padding-top: 4px;
}

.timeline-num-inner {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.04em;
  background: var(--background);
  position: relative;
  z-index: 1;
  padding-block: 2px;
}
```

```css
/* PO */
.timeline-item {
  display: grid;
  grid-template-columns: 5.5rem 1fr;   /* szersze — mieści 4rem numeral */
  gap: var(--space-6);
  padding-block: var(--space-8);
  position: relative;
}

.timeline-num {
  display: flex;
  align-items: flex-start;
}

.timeline-num-inner {
  font-family: var(--font-mono);
  font-size: 4rem;           /* duży, graficzny element */
  font-weight: 700;
  color: var(--accent);
  letter-spacing: -0.02em;
  line-height: 1;
  display: block;
  background: var(--background);
  position: relative;
  z-index: 1;
}
```

---

## Fix 3: mobile responsive

Dodaj do forma-layout.css (na końcu pliku, przed ostatnim `}`):

```css
@media (max-width: 639px) {
  .process-step {
    grid-template-columns: 3.5rem 1fr;
    gap: var(--space-4);
  }
  .process-step-num {
    font-size: 2.5rem;
  }
  .timeline-item {
    grid-template-columns: 3.5rem 1fr;
    gap: var(--space-4);
  }
  .timeline-num-inner {
    font-size: 2.5rem;
  }
}
```

---

## Weryfikacja wizualna po naprawie

Otwórz index.html i proces.html w przeglądarce:

1. Numerale 01-06 są duże (ok. 64px desktop) i NIE nakładają się na tekst
2. Tytuł kroku ("Brief", "Design", "Kod") zaczyna się po prawej stronie numeralu
3. Na mobile (zmniejsz okno do 375px) — numerale 40px, nadal nie kolidują
4. Hover na kroku — glitch animation odpala się na numeralu

Jeśli numeral nadal wychodzi poza kolumnę — zwiększ pierwszą wartość
grid-template-columns np. do `6rem`.
