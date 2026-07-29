'use client'
import { useRef, useState, useTransition } from 'react'
import type { PostItem, SiteMeta } from '@/lib/cms/types'
import type { Violation } from '@/lib/cms/validation/types'
import { postUrl, postPath } from '@/lib/cms/urls'
import { savePosts } from './actions'
import RichTextEditor from './RichTextEditor'
import GooglePreview from './GooglePreview'
import FieldHelp from '@/app/(panel)/FieldHelp'

// Usuwa okladke z R2 najlepiej-jak-sie-da — porzucony plik akceptujemy (jak w
// FieldsForm.tsx PortfolioCardsEditor.removeCard), nie blokujemy UI na tym.
async function deleteCoverBestEffort(coverImage: string | undefined): Promise<void> {
  if (!coverImage) return
  const filename = coverImage.split('?')[0].split('/').pop() ?? ''
  if (!filename) return
  try {
    await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' })
  } catch {
    // orphan accepted — known debt, patrz PortfolioCardsEditor
  }
}

const PL_CHARS: Record<string, string> = {
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
}

/** Zamienia tytul na slug zgodny z C5 (male litery, cyfry, myslniki). */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, ch => PL_CHARS[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Licznik znakow z progiem zalecanym (W6/W7) — nie blokuje, tylko informuje;
 *  twardy limit (C12) zglasza sie osobno przez errorFor(). */
function CharCount({ value, min, max }: { value: string; min: number; max: number }) {
  if (!value) return null
  const outOfRange = value.length < min || value.length > max
  return (
    <p className={outOfRange ? 'field-charcount is-out-of-range' : 'field-charcount'}>
      {value.length} znaków — zalecane {min}–{max}
    </p>
  )
}

function emptyPost(): PostItem {
  return {
    id: crypto.randomUUID(),
    slug: '',
    title: '',
    publishedAt: new Date().toISOString().slice(0, 10),
    excerpt: '',
    body: '',
    status: 'draft',
    tags: [],
    keyTakeaways: [],
  }
}

export default function PostsEditor({ initialPosts, meta }: { initialPosts: PostItem[]; meta: SiteMeta }) {
  const [posts, setPosts] = useState<PostItem[]>(initialPosts)
  const [activeId, setActiveId] = useState<string | null>(initialPosts[0]?.id ?? null)
  const [errors, setErrors] = useState<Violation[]>([])
  const [warnings, setWarnings] = useState<Violation[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle')
  const [isPending, startTransition] = useTransition()
  const [coverUploadStatus, setCoverUploadStatus] = useState<'idle' | 'uploading' | 'error'>('idle')
  const [coverUploadError, setCoverUploadError] = useState('')
  const coverInputRef = useRef<HTMLInputElement>(null)

  const active = posts.find(p => p.id === activeId) ?? null
  const activeIndex = posts.findIndex(p => p.id === activeId)

  function update(patch: Partial<PostItem>) {
    setPosts(prev => prev.map(p => (p.id === activeId ? { ...p, ...patch } : p)))
    setSaveStatus('idle')
  }

  function updateTitle(title: string) {
    if (!active) return
    // Slug podazamy za tytulem tylko dopoki klient go nie tknal recznie —
    // inaczej zmiana tytulu opublikowanego artykulu zerwalaby dzialajacy URL.
    const slugFollowsTitle = active.slug === '' || active.slug === slugify(active.title)
    update(slugFollowsTitle ? { title, slug: slugify(title) } : { title })
  }

  function addPost() {
    const post = emptyPost()
    setPosts(prev => [post, ...prev])
    setActiveId(post.id)
    setSaveStatus('idle')
  }

  function removePost(id: string) {
    const post = posts.find(p => p.id === id)
    if (!confirm(`Usunąć publikację "${post?.title || 'bez tytułu'}"? Tej operacji nie można cofnąć po zapisaniu.`)) return
    void deleteCoverBestEffort(post?.coverImage)
    setPosts(prev => prev.filter(p => p.id !== id))
    if (activeId === id) setActiveId(null)
    setSaveStatus('idle')
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !active) return

    // Zapamietane PRZED uploadem — kazdy upload dostaje teraz unikalny klucz R2 (patrz
    // route.ts), wiec stara okladka juz nie jest nadpisywana automatycznie i trzeba ja
    // posprzatac recznie, inaczej zostaje osierocona w R2.
    const previousCover = active.coverImage

    setCoverUploadStatus('uploading')
    setCoverUploadError('')

    const fd = new FormData()
    fd.append('file', file)
    fd.append('kind', 'post-cover')
    fd.append('postId', active.id)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json() as { url?: string; error?: string }
      if (!res.ok) {
        setCoverUploadStatus('error')
        setCoverUploadError(json.error ?? 'Błąd uploadu')
        return
      }
      update({ coverImage: json.url! })
      setCoverUploadStatus('idle')
      if (coverInputRef.current) coverInputRef.current.value = ''
      // Dopiero PO udanym uploadzie nowego pliku — gdyby upload sie nie udal, stara
      // okladka ma zostac nietknieta.
      void deleteCoverBestEffort(previousCover)
    } catch {
      setCoverUploadStatus('error')
      setCoverUploadError('Błąd połączenia')
    }
  }

  function removeCover() {
    if (!active) return
    void deleteCoverBestEffort(active.coverImage)
    update({ coverImage: undefined })
  }

  function handleSave() {
    setErrors([])
    setWarnings([])
    startTransition(async () => {
      const result = await savePosts(posts)
      if (result.success) {
        setWarnings(result.warnings)
        setSaveStatus('saved')
      } else {
        setErrors(result.errors)
      }
    })
  }

  /** Bledy dotyczace aktualnie otwartego artykulu, po nazwie pola. */
  function errorFor(field: string): string | undefined {
    if (activeIndex < 0) return undefined
    return errors.find(e => e.field === `collections.posts[${activeIndex}].${field}`)?.message
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem' }}>Publikacje</h1>
        <button type="button" className="btn btn-ghost" onClick={addPost}>+ Nowa publikacja</button>
      </div>

      {errors.length > 0 && (
        <div className="alert-error">
          <strong>Nie zapisano — popraw błędy:</strong>
          <ul style={{ marginTop: '6px', paddingLeft: '20px' }}>
            {errors.map((e, i) => <li key={i}>{e.message}</li>)}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="warnings">
          <strong>Ostrzeżenia</strong>
          <ul>{warnings.map((w, i) => <li key={i}>{w.message}</li>)}</ul>
        </div>
      )}

      {posts.length === 0 ? (
        <p style={{ color: 'var(--muted)', padding: '32px 0' }}>
          Nie masz jeszcze żadnych publikacji. Kliknij „Nowa publikacja”, aby dodać pierwszy artykuł.
        </p>
      ) : (
        <div className="posts-layout">
          <ul className="posts-list" aria-label="Lista publikacji">
            {posts.map(post => (
              <li key={post.id}>
                <button
                  type="button"
                  className={post.id === activeId ? 'posts-list-item is-active' : 'posts-list-item'}
                  onClick={() => setActiveId(post.id)}
                >
                  <span className="posts-list-title">{post.title || 'Bez tytułu'}</span>
                  <span className="posts-list-meta">
                    <span className={post.status === 'published' ? 'badge badge-live' : 'badge'}>
                      {post.status === 'published' ? 'opublikowany' : 'szkic'}
                    </span>
                    {post.publishedAt}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {active && (
            <div className="posts-form">
              <div className="field-row">
                <label className="field-label">
                  Tytuł
                  <FieldHelp label="Tytuł" text="Główny tytuł widoczny na stronie artykułu. Zostanie użyty jako nagłówek H1." />
                </label>
                <input
                  type="text"
                  value={active.title}
                  placeholder="np. Jak zaprojektować stronę kancelarii zgodnie z zasadami etyki"
                  onChange={e => updateTitle(e.target.value)}
                />
                {errorFor('title') && <p className="field-error">{errorFor('title')}</p>}
              </div>

              <div className="field-row">
                <label className="field-label">
                  Adres (slug)
                  <FieldHelp label="Adres (slug)" text="Fragment adresu artykułu. Używaj krótkich słów bez polskich znaków, oddzielonych myślnikami. Po publikacji nie zmieniaj go bez przekierowania." />
                </label>
                <input
                  type="text"
                  value={active.slug}
                  placeholder="etyka-zawodowa-strona-kancelarii"
                  onChange={e => update({ slug: e.target.value })}
                />
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '4px' }}>
                  Adres artykułu: {postPath(active.slug || '…')}
                </p>
                {errorFor('slug') && <p className="field-error">{errorFor('slug')}</p>}
              </div>

              <div className="posts-form-row">
                <div className="field-row" style={{ flex: 1 }}>
                  <label className="field-label">Status</label>
                  <select
                    value={active.status}
                    onChange={e => update({ status: e.target.value as PostItem['status'] })}
                  >
                    <option value="draft">Szkic (niewidoczny na stronie)</option>
                    <option value="published">Opublikowany</option>
                  </select>
                </div>

                <div className="field-row" style={{ flex: 1 }}>
                  <label className="field-label">Data publikacji</label>
                  <input
                    type="date"
                    value={active.publishedAt ?? ''}
                    onChange={e => update({ publishedAt: e.target.value || undefined })}
                  />
                  {errorFor('publishedAt') && <p className="field-error">{errorFor('publishedAt')}</p>}
                </div>
              </div>

              <div className="field-row">
                <label className="field-label">
                  Zajawka
                  <FieldHelp label="Zajawka" text="Krótkie wprowadzenie widoczne na liście publikacji. Gdy nie podasz osobnego opisu SEO, CMS wykorzysta zajawkę jako meta description." />
                </label>
                <textarea
                  rows={2}
                  value={active.excerpt ?? ''}
                  placeholder="Jedno–dwa zdania. Pokazuje się na liście publikacji i w wynikach Google."
                  onChange={e => update({ excerpt: e.target.value })}
                />
              </div>

              <div className="posts-form-row">
                <div className="field-row" style={{ flex: 1 }}>
                  <label className="field-label">
                    Kategoria
                    <FieldHelp label="Kategoria" text="Główny obszar tematyczny artykułu. Wpisz własną nazwę — np. Etyka zawodowa, Marketing kancelarii." />
                  </label>
                  <input
                    type="text"
                    value={active.category ?? ''}
                    placeholder="np. Etyka zawodowa"
                    onChange={e => update({ category: e.target.value || undefined })}
                  />
                </div>

                <div className="field-row" style={{ flex: 1 }}>
                  <label className="field-label">Tagi (oddzielone przecinkiem, maks. 8)</label>
                  <input
                    type="text"
                    value={(active.tags ?? []).join(', ')}
                    placeholder="design, ux, strategia"
                    onChange={e => update({
                      tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean),
                    })}
                  />
                  {errorFor('tags') && <p className="field-error">{errorFor('tags')}</p>}
                </div>
              </div>

              <div className="field-row">
                <label className="field-label">Okładka (1200×675, 16:9)</label>
                {active.coverImage && (
                  <div style={{ marginBottom: '8px' }}>
                    <img
                      src={active.coverImage}
                      alt="Podgląd okładki"
                      style={{ display: 'block', maxWidth: '280px', aspectRatio: '16/9', objectFit: 'cover', marginBottom: '4px' }}
                    />
                    <button type="button" className="btn btn-ghost" onClick={removeCover}>Usuń okładkę</button>
                  </div>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={coverUploadStatus === 'uploading'}
                  onChange={handleCoverChange}
                />
                {coverUploadStatus === 'uploading' && (
                  <p style={{ marginTop: '4px', color: 'var(--muted)' }}>Przesyłanie…</p>
                )}
                {coverUploadStatus === 'error' && <p className="field-error">{coverUploadError}</p>}
              </div>

              <div className="field-row">
                <label className="field-label">Kluczowe wnioski (opcjonalnie — callout na stronie artykułu)</label>
                {(active.keyTakeaways ?? []).map((point, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                    <input
                      type="text"
                      value={point}
                      onChange={e => {
                        const next = [...(active.keyTakeaways ?? [])]
                        next[i] = e.target.value
                        update({ keyTakeaways: next })
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => update({ keyTakeaways: (active.keyTakeaways ?? []).filter((_, idx) => idx !== i) })}
                    >
                      Usuń
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => update({ keyTakeaways: [...(active.keyTakeaways ?? []), ''] })}
                >
                  + Dodaj punkt
                </button>
              </div>

              <details className="posts-advanced">
                <summary>Zaawansowane ustawienia SEO</summary>

                <div className="field-row">
                  <label className="field-label">
                    Tytuł SEO
                    <FieldHelp label="Tytuł SEO" text="Tytuł używany w kodzie strony, na karcie przeglądarki i zwykle w Google. Gdy pole pozostanie puste, CMS użyje tytułu artykułu i nazwy marki." />
                  </label>
                  <input
                    type="text"
                    value={active.metaTitle ?? ''}
                    placeholder={`Domyślnie: ${active.title || '…'} | ${meta.brandName}`}
                    onChange={e => update({ metaTitle: e.target.value || undefined })}
                  />
                  <CharCount value={active.metaTitle ?? ''} min={50} max={60} />
                  {errorFor('metaTitle') && <p className="field-error">{errorFor('metaTitle')}</p>}
                </div>

                <div className="field-row">
                  <label className="field-label">
                    Opis SEO
                    <FieldHelp label="Opis SEO" text="Krótki opis strony przeznaczony dla wyszukiwarki. Nie jest widoczny w treści artykułu. Gdy pozostanie pusty, CMS użyje zajawki." />
                  </label>
                  <textarea
                    rows={2}
                    value={active.metaDescription ?? ''}
                    placeholder={`Domyślnie: zajawka artykułu${active.excerpt ? ` — "${active.excerpt}"` : ''}`}
                    onChange={e => update({ metaDescription: e.target.value || undefined })}
                  />
                  <CharCount value={active.metaDescription ?? ''} min={120} max={160} />
                  {errorFor('metaDescription') && <p className="field-error">{errorFor('metaDescription')}</p>}
                </div>

                <div className="field-row">
                  <label className="field-label">
                    Podgląd w wynikach Google
                    <FieldHelp label="Podgląd w wynikach Google" text="Przybliżony wygląd wyniku wyszukiwania. Google może zmienić tytuł lub opis zależnie od zapytania użytkownika." />
                  </label>
                  <GooglePreview
                    title={active.metaTitle || `${active.title || 'Bez tytułu'} | ${meta.brandName}`}
                    description={active.metaDescription || active.excerpt || meta.description}
                    url={postUrl(meta.canonical.replace(/\/$/, ''), active.slug || '…')}
                  />
                </div>
              </details>

              <div className="field-row">
                <label className="field-label">Treść</label>
                <RichTextEditor value={active.body} onChange={body => update({ body })} />
                {errorFor('body') && <p className="field-error">{errorFor('body')}</p>}
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                style={{ color: 'var(--error)' }}
                onClick={() => removePost(active.id)}
              >
                Usuń tę publikację
              </button>
            </div>
          )}
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn" disabled={isPending} onClick={handleSave}>
          {isPending ? 'Zapisywanie…' : 'Zapisz publikacje'}
        </button>
        {saveStatus === 'saved' && <span className="save-status">Zapisano. Kliknij „Publikuj”, aby wysłać na żywą stronę.</span>}
      </div>
    </div>
  )
}
