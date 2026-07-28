// Adres publikacji: /publikacje/<slug>.html (patrz PostItem.slug w types.ts).
// Wydzielone z export.ts, zeby renderer/publikacje.ts moglo tego uzyc bez cyklu
// importow (export.ts importuje renderPage z renderer/index).
//
// postPath/postsListPath zwracaja SCIEZKE (do pokazania w panelu), postUrl/postsListUrl
// pelny adres (canonical, JSON-LD, sitemap). Panel MUSI uzywac tych funkcji, a nie
// sklejac sciezki recznie — inaczej pokazuje klientowi adres, ktory nie istnieje
// (tak bylo do 2026-07-28: podpowiedz pod polem slug gubila ".html").
export function postPath(slug: string): string {
  return `/publikacje/${slug}.html`
}

export function postsListPath(): string {
  return '/publikacje.html'
}

export function postUrl(siteRoot: string, slug: string): string {
  return `${siteRoot}${postPath(slug)}`
}

export function postsListUrl(siteRoot: string): string {
  return `${siteRoot}${postsListPath()}`
}
