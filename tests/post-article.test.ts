import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { JSDOM } from 'jsdom'
import { parseSiteModel } from '../src/lib/cms/schema'
import { renderPostPage } from '../src/lib/cms/renderer/publikacje'
import { injectHeadingIds, renderPostToc } from '../src/lib/cms/renderer/post-toc'
import { sanitizePostBody, validatePostSources } from '../src/lib/cms/validation/collections'
import { POST_BLOCK_CLASSES } from '../src/lib/cms/post-blocks'
import type { PostItem, SiteModel } from '../src/lib/cms/types'

const ROOT = resolve(process.cwd())

describe('injectHeadingIds — kotwice w nagłówkach H2', () => {
  it('dopisuje id do każdego H2 i zwraca je w kolejności dokumentu', () => {
    const { html, headings } = injectHeadingIds(
      '<p>Wstęp</p><h2>Pierwsza sekcja</h2><p>a</p><h2>Druga sekcja</h2>',
    )
    expect(headings.map(h => h.id)).toEqual(['pierwsza-sekcja', 'druga-sekcja'])
    expect(headings.map(h => h.text)).toEqual(['Pierwsza sekcja', 'Druga sekcja'])
    expect(html).toContain('<h2 id="pierwsza-sekcja">Pierwsza sekcja</h2>')
  })

  it('polskie znaki sprowadza do ASCII', () => {
    const { headings } = injectHeadingIds('<h2>Zaświadczenie o niekaralności</h2>')
    expect(headings[0].id).toBe('zaswiadczenie-o-niekaralnosci')
  })

  it('powtórzone tytuły dostają rozróżniający sufiks', () => {
    const { headings } = injectHeadingIds('<h2>Podsumowanie</h2><h2>Podsumowanie</h2><h2>Podsumowanie</h2>')
    expect(headings.map(h => h.id)).toEqual(['podsumowanie', 'podsumowanie-2', 'podsumowanie-3'])
  })

  it('nagłówek bez znaków alfanumerycznych dostaje id zastępcze', () => {
    const { headings } = injectHeadingIds('<h2>???</h2>')
    expect(headings[0].id).toBe('sekcja-1')
  })

  it('zdejmuje zagnieżdżone znaczniki z etykiety, zostawiając je w treści nagłówka', () => {
    const { html, headings } = injectHeadingIds('<h2>Cena <strong>brutto</strong></h2>')
    expect(headings[0].text).toBe('Cena brutto')
    expect(html).toContain('<strong>brutto</strong>')
  })

  it('nadpisuje id w starszej treści, w której H2 miał już atrybuty', () => {
    const { html, headings } = injectHeadingIds('<h2 id="stare" class="x">Sekcja</h2>')
    expect(headings[0].id).toBe('sekcja')
    expect(html).toBe('<h2 id="sekcja">Sekcja</h2>')
  })

  it('nie rusza H3 — spis treści jest tylko z H2', () => {
    const { html, headings } = injectHeadingIds('<h3>Podpunkt</h3>')
    expect(headings).toHaveLength(0)
    expect(html).toBe('<h3>Podpunkt</h3>')
  })
})

describe('renderPostToc — spis treści', () => {
  it('nie powstaje przy mniej niż dwóch nagłówkach', () => {
    expect(renderPostToc([])).toBe('')
    expect(renderPostToc([{ id: 'a', text: 'A' }])).toBe('')
  })

  it('linki prowadzą do kotwic nagłówków', () => {
    const html = renderPostToc([{ id: 'a', text: 'Sekcja A' }, { id: 'b', text: 'Sekcja B' }])
    const doc = new JSDOM(`<div>${html}</div>`).window.document
    const hrefs = Array.from(doc.querySelectorAll('[data-pub-toc-link]')).map(a => a.getAttribute('href'))
    expect(hrefs).toEqual(['#a', '#b'])
  })

  it('jest rozwinięty domyślnie — bez JS spis ma być widoczny', () => {
    const html = renderPostToc([{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }])
    const doc = new JSDOM(`<div>${html}</div>`).window.document
    expect(doc.querySelector('details')?.hasAttribute('open')).toBe(true)
  })
})

describe('sanitizePostBody — bloki wyróżnione', () => {
  it('przepuszcza blockquote z rolą z zamkniętej listy', () => {
    for (const cls of POST_BLOCK_CLASSES) {
      const out = sanitizePostBody(`<blockquote class="${cls}"><p>tekst</p></blockquote>`)
      expect(out).toBe(`<blockquote class="${cls}"><p>tekst</p></blockquote>`)
    }
  })

  it('wycina klasę spoza listy, zostawiając sam blok', () => {
    expect(sanitizePostBody('<blockquote class="cokolwiek"><p>x</p></blockquote>'))
      .toBe('<blockquote><p>x</p></blockquote>')
  })

  it('z mieszanki klas zostawia wyłącznie dozwoloną', () => {
    expect(sanitizePostBody('<blockquote class="f-callout wlasny-styl"><p>x</p></blockquote>'))
      .toBe('<blockquote class="f-callout"><p>x</p></blockquote>')
  })

  it('nie pozwala nadać klasy innym znacznikom niż blockquote', () => {
    expect(sanitizePostBody('<p class="f-callout">x</p>')).toBe('<p>x</p>')
    expect(sanitizePostBody('<h2 class="f-callout">x</h2>')).toBe('<h2>x</h2>')
  })

  it('nadal usuwa procedury obsługi zdarzeń z bloku wyróżnionego', () => {
    const out = sanitizePostBody('<blockquote class="f-callout" onclick="alert(1)"><p>x</p></blockquote>')
    expect(out).not.toContain('onclick')
  })

  it('callout może zawierać kilka akapitów i listę', () => {
    const input = '<blockquote class="f-callout"><p>a</p><ul><li>b</li></ul></blockquote>'
    expect(sanitizePostBody(input)).toBe(input)
  })
})

describe('C13 — puste pozycje w źródłach', () => {
  const base: PostItem = { id: '1', slug: 's', title: 'Tytuł', body: '', status: 'draft' }

  it('zgłasza pustą pozycję', () => {
    const errors = validatePostSources([{ ...base, sources: ['Ustawa', '   '] }])
    expect(errors).toHaveLength(1)
    expect(errors[0].rule).toBe('C13')
  })

  it('milczy przy komplecie wypełnionych pozycji i przy braku pola', () => {
    expect(validatePostSources([{ ...base, sources: ['Ustawa'] }])).toHaveLength(0)
    expect(validatePostSources([base])).toHaveLength(0)
  })
})

describe('renderPostPage — spis treści i źródła', () => {
  let model: SiteModel
  let post: PostItem

  beforeAll(() => {
    const fixtureJson = JSON.parse(readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8'))
    model = parseSiteModel(fixtureJson).model
    post = model.collections.posts[0]
  })

  function render(overrides: Partial<PostItem>): Document {
    return new JSDOM(renderPostPage(model, { ...post, ...overrides })).window.document
  }

  it('spis treści linkuje do rzeczywistych kotwic w treści', () => {
    const doc = render({ body: '<h2>Pierwsza</h2><p>a</p><h2>Druga</h2><p>b</p>' })

    const hrefs = Array.from(doc.querySelectorAll('[data-pub-toc-link]'))
      .map(a => a.getAttribute('href')!.slice(1))
    expect(hrefs).toEqual(['pierwsza', 'druga'])

    // Kazda kotwica ze spisu musi istniec w tresci — inaczej link prowadzi donikad.
    for (const id of hrefs) {
      expect(doc.querySelector(`.pub-article-body h2#${id}`)).not.toBeNull()
    }
  })

  it('spis treści siedzi w bocznej kolumnie, przed treścią w kolejności DOM', () => {
    const doc = render({ body: '<h2>A</h2><h2>B</h2>' })
    const layout = doc.querySelector('.pub-article-layout')!
    expect(layout.firstElementChild?.className).toBe('pub-article-aside')
  })

  it('artykuł z jednym nagłówkiem nie dostaje ani spisu, ani pustej kolumny', () => {
    const doc = render({ body: '<h2>Jedyna sekcja</h2><p>a</p>' })
    expect(doc.querySelector('[data-pub-toc]')).toBeNull()
    expect(doc.querySelector('.pub-article-aside')).toBeNull()
  })

  it('źródła renderowane jako lista uporządkowana', () => {
    const doc = render({ sources: ['Ustawa z dnia 6 czerwca 1997 r.', 'Wyrok SN II CSK 123/23'] })
    const items = Array.from(doc.querySelectorAll('.pub-sources-list li')).map(li => li.textContent)
    expect(items).toEqual(['Ustawa z dnia 6 czerwca 1997 r.', 'Wyrok SN II CSK 123/23'])
  })

  it('adres w źródle staje się linkiem, a kropka kończąca zdanie zostaje poza nim', () => {
    const doc = render({ sources: ['Zobacz https://sn.pl/orzeczenia.'] })
    const link = doc.querySelector('.pub-sources-list a')!
    expect(link.getAttribute('href')).toBe('https://sn.pl/orzeczenia')
    expect(link.getAttribute('rel')).toBe('noopener nofollow')
    expect(doc.querySelector('.pub-sources-list li')?.textContent).toBe('Zobacz https://sn.pl/orzeczenia.')
  })

  it('treść źródła jest escapowana — nie może wnieść znacznika', () => {
    const doc = render({ sources: ['<img src=x onerror=alert(1)>Ustawa'] })
    expect(doc.querySelector('.pub-sources img')).toBeNull()
    expect(doc.querySelector('.pub-sources-list li')?.textContent).toBe('<img src=x onerror=alert(1)>Ustawa')
  })

  it('brak źródeł (i sama pusta pozycja) nie tworzy sekcji', () => {
    expect(render({ sources: undefined }).querySelector('.pub-sources')).toBeNull()
    expect(render({ sources: [] }).querySelector('.pub-sources')).toBeNull()
    expect(render({ sources: ['  '] }).querySelector('.pub-sources')).toBeNull()
  })

  it('nagłówek sekcji źródeł nie trafia do spisu treści', () => {
    const doc = render({ body: '<h2>A</h2><h2>B</h2>', sources: ['Ustawa'] })
    const labels = Array.from(doc.querySelectorAll('[data-pub-toc-link]')).map(a => a.textContent)
    expect(labels).toEqual(['A', 'B'])
    expect(doc.querySelector('.pub-sources-label')).not.toBeNull()
  })
})

describe('SiteModel — pole sources przeżywa walidację', () => {
  it('parseSiteModel nie gubi źródeł (z.object wycina klucze spoza schematu)', () => {
    const fixtureJson = JSON.parse(readFileSync(resolve(ROOT, 'fixtures/forma-site.json'), 'utf-8'))
    fixtureJson.collections.posts[0].sources = ['Ustawa z dnia 6 czerwca 1997 r.']

    const { model } = parseSiteModel(fixtureJson)
    expect(model.collections.posts[0].sources).toEqual(['Ustawa z dnia 6 czerwca 1997 r.'])
  })
})
