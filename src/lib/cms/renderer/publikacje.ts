import type { PostItem, SiteModel } from '../types'
import { postUrl, postsListUrl } from '../urls'
import { renderHead } from './head'
import { renderNav } from './sections/nav'
import { renderFooter } from './sections/footer'
import { buildBaseRenderContext, renderShell } from './shell'
import { resolveImageSrc } from './image'
import { escapeHtml, pageHref, rootHref } from './utils'
import { injectHeadingIds, renderPostToc } from './post-toc'
import { buildBlogPostingJsonLd, buildBreadcrumbListJsonLd } from './post-jsonld'
import type { Lang } from './context'
import { t } from './i18n'

const ARROW_ICON_SM = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`
const BOOKMARK_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`
const SEARCH_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`

// Liczony przy kazdym renderze z tresci body — nigdy nie zapisywany w modelu, wiec
// zawsze aktualny i nie wymaga pola w edytorze.
export function computeReadTime(body: string): number {
  const text = body.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

function formatDate(dateStr: string | undefined, lang: Lang): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString(t(lang).publikacje.dateLocale, { year: 'numeric', month: 'long', day: 'numeric' })
}

function publishedPostsSortedDesc(model: SiteModel): PostItem[] {
  return model.collections.posts
    .filter(p => p.status === 'published')
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
}

// Kontekst wspolny dla obu stron: nav/footer pochodza z sekcji strony "index" (nie
// istnieje osobny Page.sections dla /publikacje — to jest stub bez sekcji, patrz
// migrate-add-publikacje-page.ts), ale sa identyczne site-wide wiec to bezpieczne
// zrodlo. showCurrentInFooter: false — publikacje wygladaja jak reszta serwisu
// (index/proces/portfolio), nie jak strony utility (kontakt/legal/404).
function renderNavAndFooter(model: SiteModel, basePath: string, linkMode: 'static' | 'preview') {
  const indexPage = model.pages.find(p => p.slug === 'index')
  if (!indexPage) throw new Error('Strona "index" jest wymagana (zrodlo nav/footer dla /publikacje)')
  const navSection = indexPage.sections.find(s => s.id === 'nav')
  const footerSection = indexPage.sections.find(s => s.id === 'footer')
  if (!navSection || !footerSection) throw new Error('Strona "index" nie ma sekcji nav/footer')

  const ctx = buildBaseRenderContext(model, {
    basePath, linkMode, currentPage: 'publikacje', showCurrentInFooter: false,
  })

  return { navHtml: renderNav(navSection, ctx), footerHtml: renderFooter(footerSection, ctx) }
}

// Kategorie sa wylaczone w UI (decyzja 2026-07-28: brak ustalonej taksonomii tematow).
// Pole PostItem.category, walidator i atrybut data-category zostaja — wlaczenie z
// powrotem to przywrocenie pigulki i grupy przyciskow, bez migracji danych.

// Sekcja zrodel. W przeciwienstwie do reszty pol modelu tekst jest ESCAPOWANY — to pole
// dodane 2026-07-31 i nie ma powodu, zeby sygnatura wyroku mogla wniesc znacznik.
// Adresy http(s) zamieniamy na klikalne linki: dzielimy tekst SUROWY po wzorcu URL i
// escapujemy kazdy kawalek osobno, wiec do href trafia adres, a nie fragment znacznika.
const SOURCE_URL_RE = /(https?:\/\/[^\s]+)/g

function renderSourceItem(raw: string): string {
  return raw
    .split(SOURCE_URL_RE)
    .map((part, i) => {
      if (i % 2 === 0) return escapeHtml(part)
      // Kropka/przecinek na koncu zdania nie naleza do adresu — zostawiamy je poza linkiem.
      const url = part.replace(/[.,;:!?)\]}]+$/, '')
      const trailing = part.slice(url.length)
      const href = escapeHtml(url)
      return `<a href="${href}" target="_blank" rel="noopener nofollow">${href}</a>${escapeHtml(trailing)}`
    })
    .join('')
}

function renderSources(sources: string[] | undefined, lang: Lang): string {
  const list = (sources ?? []).filter(s => s.trim() !== '')
  if (list.length === 0) return ''

  return `<footer class="pub-sources" aria-labelledby="pub-sources-heading">
        <h2 id="pub-sources-heading" class="pub-sources-label">${t(lang).publikacje.sourcesHeading}</h2>
        <ol class="pub-sources-list">
          ${list.map(s => `<li>${renderSourceItem(s)}</li>`).join('\n          ')}
        </ol>
      </footer>`
}

function renderTags(tags: string[] | undefined, max?: number): string {
  const list = max ? (tags ?? []).slice(0, max) : (tags ?? [])
  if (list.length === 0) return ''
  return `<div class="pub-card-tags">${list.map(t => `<span class="pub-tag">#${t}</span>`).join('')}</div>`
}

// Karty per strona w paginacji (dziala nawet z tysiacem artykulow — patrz plan:
// skala do ~15 to minimum, nie limit). Bez JS wszystkie karty widoczne (patrz
// forma-layout.css: .js-page-hidden jest ukrywane dopiero pod .js-on).
export const PUB_PAGE_SIZE = 7
// Liczba kart w lewej kolumnie "GŁÓWNE PUBLIKACJE" na kazdej stronie paginacji —
// reszta strony trafia do sidebara "POZOSTAŁE PUBLIKACJE" (wzor Stitch PublicationsView.tsx).
export const PUB_FEATURED_COUNT = 3

// Jedna wspolna struktura karty dla obu kolumn — rozne wygladu (duzy hero z overlay
// vs kompaktowy sidebar) daje wylacznie CSS przez modyfikator .pub-card--featured,
// zeby nie duplikowac tresci posta w dwoch roznych znacznikach (SEO/a11y).
function renderCard(post: PostItem, basePath: string, linkMode: 'static' | 'preview', lang: Lang, opts: { onFirstPage: boolean; featured: boolean; authorHtml: string }): string {
  const ui = t(lang).publikacje
  const href = pageHref(`publikacje/${post.slug}`, linkMode)
  const readTime = computeReadTime(post.body)
  const year = (post.publishedAt ?? '').slice(0, 4)
  const searchBlob = [post.title, post.excerpt ?? '', ...(post.tags ?? [])].join(' ').toLowerCase()

  const thumbHtml = post.coverImage
    ? `<a href="${href}" class="pub-card-thumb" tabindex="-1" aria-hidden="true">
        <img src="${resolveImageSrc(post.coverImage, basePath, linkMode, '')}" alt=""
          width="1200" height="675" class="img-fill" loading="lazy" decoding="async">
      </a>`
    : ''

  // pub-card--has-thumb steruje w CSS, czy kategoria/zakladka nakladaja sie na zdjecie
  // (overlay) czy stoja w normalnym przeplywie — bez tego rozroznienia karta featured
  // bez okladki mialaby kategorie/zakladke nachodzace na wiersz z data (brak zdjecia
  // pod ktorym mialyby "plynac" absolutnie pozycjonowane elementy).
  const cardClass = [
    'pub-card', 'interactive-card',
    opts.featured ? 'pub-card--featured' : 'pub-card--compact',
    post.coverImage ? 'pub-card--has-thumb' : '',
    opts.onFirstPage ? '' : 'js-page-hidden',
  ].filter(Boolean).join(' ')

  return `<article class="${cardClass}" data-pub-card
      data-post-id="${post.id}" data-category="${post.category ?? ''}" data-year="${year}"
      data-date="${post.publishedAt ?? ''}" data-search="${searchBlob}">
    ${thumbHtml}
    <div class="pub-card-body">
      <div class="pub-card-meta">
        <time datetime="${post.publishedAt ?? ''}">${formatDate(post.publishedAt, lang)}</time>
        <span class="pub-read-time">${readTime} ${ui.readTimeUnit}</span>
        ${opts.authorHtml}
      </div>
      <h2 class="pub-card-title"><a href="${href}">${post.title}</a></h2>
      ${post.excerpt ? `<p class="pub-card-excerpt">${post.excerpt}</p>` : ''}
      <div class="pub-card-footer">
        ${renderTags(post.tags, 3)}
        <div class="pub-card-actions">
          <button type="button" class="pub-bookmark" data-pub-bookmark="${post.id}"
            aria-label="${ui.bookmarkAria}" aria-pressed="false">${BOOKMARK_ICON}</button>
          <a href="${href}" class="pub-card-link" aria-label="${ui.cardLinkAria(post.title)}">
            <span class="pub-card-link-long">${ui.cardLinkLong}</span><span class="pub-card-link-short">${ui.cardLinkShort}</span>${ARROW_ICON_SM}
          </a>
        </div>
      </div>
    </div>
  </article>`
}

export function renderPostsListPage(model: SiteModel, basePath = '', linkMode: 'static' | 'preview' = 'static'): string {
  const lang = model.meta.lang ?? 'pl'
  const ui = t(lang).publikacje
  const posts = publishedPostsSortedDesc(model)
  const siteRoot = model.meta.canonical.replace(/\/$/, '')
  const { navHtml, footerHtml } = renderNavAndFooter(model, basePath, linkMode)

  const head = renderHead(
    model.meta,
    {
      title: ui.listTitle(model.meta.brandName),
      description: ui.listDescription,
      canonical: postsListUrl(siteRoot),
      ogTitle: ui.listTitle(model.meta.brandName),
      ogDescription: ui.listDescription,
      ogUrl: postsListUrl(siteRoot),
    },
    undefined,
    basePath,
  )

  const years = Array.from(new Set(posts.map(p => (p.publishedAt ?? '').slice(0, 4)).filter(Boolean))).sort().reverse()

  const filterBar = `<div class="pub-filter-bar" data-pub-filter-bar>
    <div class="pub-filter-row">
      <div class="pub-search-wrap">
        ${SEARCH_ICON}
        <input type="search" class="pub-search" placeholder="${ui.searchPlaceholder}" aria-label="${ui.searchAria}" data-pub-search>
      </div>
    </div>
    <div class="pub-filter-row">
      <div class="pub-filter-group" role="group" aria-label="${ui.filterByYearAria}">
        <button type="button" class="pub-filter-btn is-active" data-pub-year="WSZYSTKIE">${ui.allYears}</button>
        ${years.map(y => `<button type="button" class="pub-filter-btn" data-pub-year="${y}">${y}</button>`).join('\n        ')}
      </div>
      <div class="pub-controls-group">
        <button type="button" class="pub-sort-btn" data-pub-sort aria-label="${ui.sortAria}">${ui.sortNewest}</button>
        <div class="pub-view-toggle" role="group" aria-label="${ui.viewToggleAria}">
          <button type="button" class="pub-view-btn is-active" data-pub-view="grid" aria-label="${ui.viewGridAria}">${ui.viewGrid}</button>
          <button type="button" class="pub-view-btn" data-pub-view="list" aria-label="${ui.viewListAria}">${ui.viewList}</button>
        </div>
      </div>
    </div>
  </div>`

  const authorHtml = model.meta.authorName
    ? `<span class="pub-card-author"><span class="pub-card-author-name">${model.meta.authorName}</span></span>`
    : ''

  const totalPages = Math.max(1, Math.ceil(posts.length / PUB_PAGE_SIZE))
  // Podzial na kolumny liczony per-strona paginacji (pierwsze PUB_FEATURED_COUNT
  // widocznych na stronie 1 -> lewa kolumna, reszta strony 1 -> sidebar). Kolejne
  // strony (ukryte pod .js-page-hidden bez JS-owej paginacji) traktujemy tak samo,
  // zeby po przejsciu strony w kliencie podzial byl spojny — patrz publications.js.
  const featuredCards = posts
    .slice(0, PUB_FEATURED_COUNT)
    .map((p, i) => renderCard(p, basePath, linkMode, lang, { onFirstPage: i < PUB_PAGE_SIZE, featured: true, authorHtml }))
    .join('\n      ')
  const sidebarCards = posts
    .slice(PUB_FEATURED_COUNT)
    .map((p, i) => renderCard(p, basePath, linkMode, lang, { onFirstPage: (i + PUB_FEATURED_COUNT) < PUB_PAGE_SIZE, featured: false, authorHtml }))
    .join('\n      ')

  const listBody = posts.length === 0
    ? `<p class="pub-empty">${ui.emptyAll}</p>`
    : `${filterBar}
    <p class="pub-empty-filtered" data-pub-empty hidden>${ui.emptyFiltered} <button type="button" class="pub-reset-filters" data-pub-reset>${ui.resetFilters}</button></p>
    <div class="pub-split" data-pub-split data-pub-view="grid" data-pub-page-size="${PUB_PAGE_SIZE}" data-pub-featured-count="${PUB_FEATURED_COUNT}">
      <div class="pub-featured-col" data-pub-featured-col>
        <div class="pub-split-header">
          <span class="pub-split-label">${ui.featuredLabel} (<span data-pub-featured-total>${Math.min(PUB_FEATURED_COUNT, posts.length)}</span>)</span>
          <span class="pub-split-tag">${ui.featuredTag}</span>
        </div>
        ${featuredCards}
      </div>
      <aside class="pub-sidebar-col" data-pub-sidebar-col>
        <div class="pub-split-header">
          <span class="pub-split-label">${ui.sidebarLabel}</span>
          <span class="pub-split-count" data-pub-sidebar-total>${Math.max(0, posts.length - PUB_FEATURED_COUNT)}</span>
        </div>
        ${sidebarCards || `<p class="pub-sidebar-empty">${ui.emptySidebar}</p>`}
      </aside>
    </div>
    <nav class="pub-pagination" data-pub-pagination aria-label="${ui.paginationAria}">
      <button type="button" class="pub-page-prev" data-pub-prev aria-label="${ui.paginationPrevAria}" disabled>${ui.paginationPrev}</button>
      <span class="pub-page-status" data-pub-page-status>${ui.paginationStatus(1, totalPages)}</span>
      <button type="button" class="pub-page-next" data-pub-next aria-label="${ui.paginationNextAria}"${totalPages <= 1 ? ' disabled' : ''}>${ui.paginationNext}</button>
    </nav>`

  const mainInner = `<!-- SEKCJA: publikacje (lista) -->
<section id="publikacje-lista" class="section bg-base reveal pub-list-page" aria-labelledby="publikacje-heading">
  <div class="container">
    <div class="section-header">
      <span class="section-label">${ui.pageLabel}</span>
      <h1 id="publikacje-heading" class="f-display">${ui.pageLabel}</h1>
      <p class="f-lead max-54">${ui.heroLead}</p>
    </div>
    ${listBody}
  </div>
</section>`

  return renderShell({
    head, navHtml, mainInner, footerHtml,
    preMainVariant: 'plain', basePath, linkMode,
    lang, gaId: model.meta.gaId,
    extraScripts: [`<script src="${basePath}assets/js/publications.js" defer></script>`],
  })
}

export function renderPostPage(model: SiteModel, post: PostItem, basePath = '', linkMode: 'static' | 'preview' = 'static'): string {
  const lang = model.meta.lang ?? 'pl'
  const ui = t(lang).publikacje
  const siteRoot = model.meta.canonical.replace(/\/$/, '')
  const canonicalUrl = postUrl(siteRoot, post.slug)
  const { navHtml, footerHtml } = renderNavAndFooter(model, basePath, linkMode)
  const readTime = computeReadTime(post.body)

  // metaTitle/metaDescription nadpisuja domyslny tytul/opis (patrz C12 dlugosc,
  // W6/W7 zalecane zakresy) — puste pole = zachowanie bez zmian.
  const effectiveTitle = post.metaTitle || `${post.title} | ${model.meta.brandName}`
  const effectiveDescription = post.metaDescription || post.excerpt || model.meta.description

  const head = renderHead(
    model.meta,
    {
      title: effectiveTitle,
      description: effectiveDescription,
      canonical: canonicalUrl,
      ogTitle: post.metaTitle || post.title,
      ogDescription: effectiveDescription,
      ogUrl: canonicalUrl,
    },
    undefined,
    basePath,
    post.coverImage,
  )

  const jsonLd = [
    buildBlogPostingJsonLd(post, model.meta, canonicalUrl),
    buildBreadcrumbListJsonLd(post, model.meta, postsListUrl(siteRoot), canonicalUrl),
  ].join('\n')

  const authorBadge = model.meta.authorName
    ? `<div class="pub-author-badge">
        <span class="pub-author-name">${model.meta.authorName}</span>
        ${model.meta.authorRole ? `<span class="pub-author-role">${model.meta.authorRole}</span>` : ''}
      </div>`
    : ''

  const coverHtml = post.coverImage
    ? `<div class="pub-article-cover">
        <img src="${resolveImageSrc(post.coverImage, basePath, linkMode, '')}" alt=""
          width="1200" height="675" class="img-fill" loading="lazy" decoding="async">
      </div>`
    : ''

  const takeawaysHtml = post.keyTakeaways && post.keyTakeaways.length > 0
    ? `<aside class="pub-takeaways" aria-labelledby="pub-takeaways-heading">
        <h2 id="pub-takeaways-heading" class="pub-takeaways-label">${ui.takeawaysHeading}</h2>
        <ul>
          ${post.keyTakeaways.map((k, i) => `<li><span class="pub-takeaways-num">0${i + 1}.</span> ${k}</li>`).join('\n          ')}
        </ul>
      </aside>`
    : ''

  // Kotwice w naglowkach i spis tresci licza sie z tresci przy renderze — nic z tego
  // nie jest zapisywane w modelu, wiec zmiana tytulu sekcji od razu przestawia oba.
  const { html: bodyHtml, headings } = injectHeadingIds(post.body)
  const tocHtml = renderPostToc(headings)

  const sorted = publishedPostsSortedDesc(model)
  const idx = sorted.findIndex(p => p.id === post.id)
  const newerPost = idx > 0 ? sorted[idx - 1] : undefined
  const olderPost = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : undefined

  // Bez prefiksu "publikacje/" — ta strona SAMA juz jest w /publikacje/, wiec sasiedni
  // artykul to plik w tym samym katalogu (pageHref('slug', linkMode) = "slug.html").
  const adjacentNavHtml = (newerPost || olderPost)
    ? `<nav class="pub-adjacent-nav" aria-label="${ui.adjacentNavAria}">
        ${olderPost
          ? `<a href="${pageHref(olderPost.slug, linkMode)}" class="pub-adjacent-link pub-adjacent-prev">
              <span class="pub-adjacent-dir">${ui.prevArticle}</span>
              <span class="pub-adjacent-title">${olderPost.title}</span>
            </a>`
          : '<span></span>'}
        ${newerPost
          ? `<a href="${pageHref(newerPost.slug, linkMode)}" class="pub-adjacent-link pub-adjacent-next">
              <span class="pub-adjacent-dir">${ui.nextArticle}</span>
              <span class="pub-adjacent-title">${newerPost.title}</span>
            </a>`
          : '<span></span>'}
      </nav>`
    : ''

  const mainInner = `${jsonLd}
<!-- SEKCJA: publikacje (artykuł) -->
<section id="publikacje-artykul" class="section bg-base pub-article-page" aria-labelledby="pub-article-title">
  <div class="container">
    <a href="${rootHref('publikacje', basePath, linkMode)}" class="pub-back-link">${ui.backToList}</a>

    <article aria-labelledby="pub-article-title">
      <header class="pub-article-header">
        <div class="pub-article-meta">
          <time datetime="${post.publishedAt ?? ''}">${formatDate(post.publishedAt, lang)}</time>
          <span class="pub-read-time">${readTime} ${ui.readTimeUnitArticle}</span>
          <button type="button" class="pub-bookmark" data-pub-bookmark="${post.id}"
            aria-label="${ui.bookmarkAria}" aria-pressed="false">${BOOKMARK_ICON}</button>
        </div>
        <h1 id="pub-article-title" class="pub-article-title">${post.title}</h1>
        ${post.excerpt ? `<p class="pub-article-lead">${post.excerpt}</p>` : ''}
        ${authorBadge}
      </header>

      ${coverHtml}
      ${takeawaysHtml}

      <div class="pub-article-layout">
        ${tocHtml ? `<aside class="pub-article-aside">${tocHtml}</aside>` : ''}
        <div class="pub-article-main">
          <div class="pub-article-body">
            ${bodyHtml}
          </div>

          ${renderSources(post.sources, lang)}
          ${renderTags(post.tags)}
        </div>
      </div>
    </article>

    <div class="pub-article-footer">
      <button type="button" class="pub-copy-link" data-pub-copy-link data-url="${canonicalUrl}">
        ${ui.copyLink}
      </button>
      <a href="${rootHref('kontakt', basePath, linkMode)}" class="btn-primary">${ui.describeFirmCta}</a>
    </div>

    ${adjacentNavHtml}
  </div>
</section>`

  return renderShell({
    head, navHtml, mainInner, footerHtml,
    preMainVariant: 'rich', basePath, linkMode,
    lang, gaId: model.meta.gaId,
    extraScripts: [`<script src="${basePath}assets/js/publications.js" defer></script>`],
  })
}
