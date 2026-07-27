// Wydzielone z sections/portfolio.ts i sections/portfolio-grid.ts (byly zduplikowane
// bajt-w-bajt). Reuzywane tez przez karty publikacji (okladki).
export function resolveImageSrc(src: string | undefined, basePath: string, linkMode: 'static' | 'preview', fallback = 'assets/images/wojtas-hero.png'): string {
  const imgSrc = src || fallback
  // R2/CDN absolute URL — use directly in both static and preview
  if (imgSrc.startsWith('http')) return imgSrc
  // Legacy local upload (pre-R2) — backward compat
  if (imgSrc.startsWith('/uploads/')) {
    if (linkMode === 'static') return `assets/images/${imgSrc.split('/').pop()!}`
    return imgSrc  // preview: Next.js serves /uploads/
  }
  return imgSrc.startsWith('/') ? imgSrc : `${basePath}${imgSrc}`
}
