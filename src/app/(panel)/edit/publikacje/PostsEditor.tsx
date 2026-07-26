'use client'
import { useState, useTransition } from 'react'
import type { PostItem } from '@/lib/cms/types'
import type { Violation } from '@/lib/cms/validation/types'
import { savePosts } from './actions'
import RichTextEditor from './RichTextEditor'

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

function emptyPost(): PostItem {
  return {
    id: crypto.randomUUID(),
    slug: '',
    title: '',
    publishedAt: new Date().toISOString().slice(0, 10),
    excerpt: '',
    body: '',
    status: 'draft',
  }
}

export default function PostsEditor({ initialPosts }: { initialPosts: PostItem[] }) {
  const [posts, setPosts] = useState<PostItem[]>(initialPosts)
  const [activeId, setActiveId] = useState<string | null>(initialPosts[0]?.id ?? null)
  const [errors, setErrors] = useState<Violation[]>([])
  const [warnings, setWarnings] = useState<Violation[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle')
  const [isPending, startTransition] = useTransition()

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
    setPosts(prev => prev.filter(p => p.id !== id))
    if (activeId === id) setActiveId(null)
    setSaveStatus('idle')
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
                <label className="field-label">Tytuł</label>
                <input
                  type="text"
                  value={active.title}
                  placeholder="np. Jak zaprojektować stronę kancelarii zgodnie z zasadami etyki"
                  onChange={e => updateTitle(e.target.value)}
                />
                {errorFor('title') && <p className="field-error">{errorFor('title')}</p>}
              </div>

              <div className="field-row">
                <label className="field-label">Adres (slug)</label>
                <input
                  type="text"
                  value={active.slug}
                  placeholder="etyka-zawodowa-strona-kancelarii"
                  onChange={e => update({ slug: e.target.value })}
                />
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '4px' }}>
                  Adres artykułu: /publikacje/{active.slug || '…'}
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
                <label className="field-label">Zajawka</label>
                <textarea
                  rows={2}
                  value={active.excerpt ?? ''}
                  placeholder="Jedno–dwa zdania. Pokazuje się na liście publikacji i w wynikach Google."
                  onChange={e => update({ excerpt: e.target.value })}
                />
              </div>

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
