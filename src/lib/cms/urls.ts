// Adres publikacji: publikacje/<slug>.html (patrz PostItem.slug w types.ts oraz
// PostsEditor.tsx, ktore ta sama konwencje pokazuje uzytkownikowi w panelu).
// Wydzielone z export.ts, zeby renderer/publikacje.ts moglo tego uzyc bez cyklu
// importow (export.ts importuje renderPage z renderer/index).
export function postUrl(siteRoot: string, slug: string): string {
  return `${siteRoot}/publikacje/${slug}.html`
}

export function postsListUrl(siteRoot: string): string {
  return `${siteRoot}/publikacje.html`
}
