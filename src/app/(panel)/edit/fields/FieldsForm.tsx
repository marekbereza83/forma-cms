'use client'
import { useState, useTransition, useRef } from 'react'
import type { SiteModel, PricingPackage, ProcessStep, StatCard, PortfolioCard, FaqItem, DeliverableItem } from '@/lib/cms/types'
import type { Violation } from '@/lib/cms/validation/types'
import { setFieldValue } from '@/lib/cms/fields'
import { saveFields } from './actions'

interface Props {
  initialModel: SiteModel
}

// ── Error matching ────────────────────────────────────────────────────────────
//
// Violation.field format from validators:
//   exact:    "sectionId.fieldName"          (V5, V6, V12, W3)
//   subfield: "sectionId.fieldName.subfield" (V1 → .amount, V8 → .features)
//
// For a given (sectionId, fieldName), collect:
//   row  — error for the field row itself (exact match)
//   sub  — errors for sub-inputs (keyed by subfield name, e.g. "amount")

interface FieldErrors {
  row: string
  sub: Record<string, string>
}

function matchErrors(
  allErrors: Record<string, string>,
  sectionId: string,
  fieldName: string,
): FieldErrors {
  const prefix = `${sectionId}.${fieldName}`
  let row = ''
  const sub: Record<string, string> = {}
  for (const [k, v] of Object.entries(allErrors)) {
    if (k === prefix) row = v
    else if (k.startsWith(prefix + '.')) sub[k.slice(prefix.length + 1)] = v
  }
  return { row, sub }
}

// ── Sub-editors ───────────────────────────────────────────────────────────────

function PriceEditor({
  value,
  errors,
  onChange,
}: {
  value: PricingPackage
  errors: Record<string, string>
  onChange: (v: PricingPackage) => void
}) {
  return (
    <div className="price-editor">
      <div>
        <p className="price-editor-label">Kwota</p>
        <input
          type="text"
          className={errors['amount'] ? 'error' : ''}
          value={value.amount}
          onChange={e => onChange({ ...value, amount: e.target.value })}
        />
        {errors['amount'] && <p className="field-error">{errors['amount']}</p>}
      </div>
      <div>
        <p className="price-editor-label">Informacja o terminie</p>
        <input
          type="text"
          value={value.deliveryNote}
          onChange={e => onChange({ ...value, deliveryNote: e.target.value })}
        />
      </div>
      <div>
        <p className="price-editor-label">Etykieta przycisku CTA</p>
        <input
          type="text"
          value={value.ctaLabel}
          onChange={e => onChange({ ...value, ctaLabel: e.target.value })}
        />
      </div>
      <div>
        <p className="price-editor-label">Mikrokopia CTA</p>
        <input
          type="text"
          value={value.ctaMicrocopy}
          onChange={e => onChange({ ...value, ctaMicrocopy: e.target.value })}
        />
      </div>
      <div>
        <p className="price-editor-label">Elementy pakietu (każdy w osobnej linii)</p>
        <textarea
          className={errors['features'] ? 'error' : ''}
          value={value.features.join('\n')}
          onChange={e => onChange({ ...value, features: e.target.value.split('\n') })}
          rows={5}
        />
        {errors['features'] && <p className="field-error">{errors['features']}</p>}
      </div>
    </div>
  )
}

// ── ZIP download ─────────────────────────────────────────────────────────────

function DownloadZipButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  async function handleDownload() {
    setStatus('loading')
    try {
      const res = await fetch('/api/export', { method: 'POST' })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'forma-site.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setStatus('idle')
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={() => void handleDownload()}
      disabled={status === 'loading'}
    >
      {status === 'loading' ? 'Pakowanie…' : status === 'error' ? 'Błąd — spróbuj ponownie' : 'Pobierz stronę (ZIP)'}
    </button>
  )
}

// ── Portfolio card editor ─────────────────────────────────────────────────────

function PortfolioCardEditor({
  card,
  onChange,
  showLinkField = false,
}: {
  card: PortfolioCard
  onChange: (v: PortfolioCard) => void
  showLinkField?: boolean
}) {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'error'>('idle')
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadStatus('uploading')
    setUploadError('')

    const fd = new FormData()
    fd.append('file', file)
    fd.append('cardId', card.id!)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json() as { url?: string; error?: string }
      if (!res.ok) {
        setUploadStatus('error')
        setUploadError(json.error ?? 'Błąd uploadu')
        return
      }
      onChange({ ...card, image: json.url! })
      setUploadStatus('idle')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      setUploadStatus('error')
      setUploadError('Błąd połączenia')
    }
  }

  return (
    <div className="list-item">
      <div>
        <p className="list-item-label">Etykieta (typ kancelarii, miasto, rok)</p>
        <input
          type="text"
          value={card.label}
          onChange={e => onChange({ ...card, label: e.target.value })}
        />
      </div>
      <div>
        <p className="list-item-label">Nazwa klienta</p>
        <input
          type="text"
          value={card.title}
          onChange={e => onChange({ ...card, title: e.target.value })}
        />
      </div>
      <div>
        <p className="list-item-label">Opis realizacji</p>
        <textarea
          value={card.desc}
          onChange={e => onChange({ ...card, desc: e.target.value })}
          rows={3}
        />
      </div>
      <div>
        <p className="list-item-label">Zdjęcie realizacji (800×450, 16:9)</p>
        {card.image && (
          <img
            src={card.image}
            alt="Podgląd zdjęcia realizacji"
            style={{ display: 'block', maxWidth: '200px', aspectRatio: '16/9', objectFit: 'cover', marginBottom: '8px' }}
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploadStatus === 'uploading'}
          onChange={handleFileChange}
        />
        {uploadStatus === 'uploading' && (
          <p style={{ marginTop: '4px', color: 'var(--fg)', opacity: 0.6 }}>Przesyłanie…</p>
        )}
        {uploadStatus === 'error' && (
          <p className="field-error">{uploadError}</p>
        )}
      </div>
      {showLinkField && (
        <div>
          <p className="list-item-label">Link do żywej strony (opcjonalny, musi zaczynać się od https:// lub http://)</p>
          <input
            type="text"
            placeholder="https://kancelaria-przyklad.pl"
            value={card.link ?? ''}
            onChange={e => onChange({ ...card, link: e.target.value })}
          />
        </div>
      )}
    </div>
  )
}

function PortfolioCardsEditor({
  cards,
  onChange,
  maxCards = 4,
  showLinkField = false,
}: {
  cards: PortfolioCard[]
  onChange: (v: PortfolioCard[]) => void
  maxCards?: number
  showLinkField?: boolean
}) {
  function updateCard(i: number, updated: PortfolioCard) {
    const next = [...cards]
    next[i] = updated
    onChange(next)
  }

  async function removeCard(i: number) {
    const card = cards[i]
    // Best-effort delete of uploaded file from R2 (or legacy /uploads/) — accept orphan if network fails.
    // DELETE endpoint validates filename format (FILENAME_RE) and rejects invalid keys with 400.
    if (card.image && card.image.length > 0) {
      const filename = card.image.split('?')[0].split('/').pop() ?? ''
      if (filename) {
        try {
          await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' })
        } catch { /* orphan accepted — known debt */ }
      }
    }
    onChange(cards.filter((_, idx) => idx !== i))
  }

  function addCard() {
    if (cards.length >= maxCards) return
    onChange([...cards, {
      id: crypto.randomUUID(),
      label: '',
      title: '',
      desc: '',
      image: '',
      ...(showLinkField ? { link: '' } : {}),
    }])
  }

  return (
    <div className="list-editor">
      {cards.map((card, i) => (
        <div key={card.id ?? i} style={{ position: 'relative', paddingTop: '8px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', marginTop: i > 0 ? '16px' : 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--accent)', margin: 0 }}>
              Realizacja {i + 1}
            </p>
            {cards.length > 1 && (
              <button
                type="button"
                onClick={() => void removeCard(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}
                aria-label={`Usuń realizację ${i + 1}`}
              >
                × Usuń
              </button>
            )}
          </div>
          <PortfolioCardEditor card={card} onChange={v => updateCard(i, v)} showLinkField={showLinkField} />
        </div>
      ))}

      {cards.length < maxCards ? (
        <button
          type="button"
          onClick={addCard}
          style={{ marginTop: '16px', background: 'none', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', cursor: 'pointer', color: 'var(--text-secondary)', width: '100%' }}
        >
          + Dodaj realizację
        </button>
      ) : (
        <p style={{ marginTop: '12px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          Maksimum {maxCards} realizacje.
        </p>
      )}
    </div>
  )
}

function FaqEditor({
  items,
  onChange,
}: {
  items: FaqItem[]
  onChange: (v: FaqItem[]) => void
}) {
  function update(i: number, updated: FaqItem) {
    const next = [...items]
    next[i] = updated
    onChange(next)
  }

  return (
    <div className="list-editor">
      {items.map((item, i) => (
        <div key={item.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', paddingTop: i > 0 ? '16px' : 0, marginTop: i > 0 ? '16px' : 0 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--accent)', marginBottom: '8px', marginTop: 0 }}>
            Pytanie {item.id}
          </p>
          <div className="list-item">
            <div>
              <p className="list-item-label">Pytanie</p>
              <input
                type="text"
                value={item.question}
                onChange={e => update(i, { ...item, question: e.target.value })}
              />
            </div>
            <div>
              <p className="list-item-label">Odpowiedź</p>
              <textarea
                value={item.answer}
                onChange={e => update(i, { ...item, answer: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ListEditor({
  value,
  onChange,
}: {
  value: unknown[]
  onChange: (v: unknown[]) => void
}) {
  if (value.length === 0) return null

  const first = value[0]

  // FaqItem: { id, question, answer }
  if (typeof first === 'object' && first !== null && 'question' in first && 'answer' in first && 'id' in first) {
    return <FaqEditor items={value as FaqItem[]} onChange={onChange as (v: FaqItem[]) => void} />
  }

  // ProcessStep: { num, title, body }
  if (typeof first === 'object' && first !== null && 'num' in first && 'title' in first) {
    return (
      <div className="list-editor">
        {(value as ProcessStep[]).map((step, i) => (
          <div key={i} className="list-item">
            <div>
              <p className="list-item-label">Numer kroku</p>
              <input type="text" value={step.num} readOnly />
            </div>
            <div>
              <p className="list-item-label">Tytuł</p>
              <input
                type="text"
                value={step.title}
                onChange={e => {
                  const updated = [...(value as ProcessStep[])]
                  updated[i] = { ...step, title: e.target.value }
                  onChange(updated)
                }}
              />
            </div>
            <div>
              <p className="list-item-label">Opis</p>
              <textarea
                value={step.body}
                onChange={e => {
                  const updated = [...(value as ProcessStep[])]
                  updated[i] = { ...step, body: e.target.value }
                  onChange(updated)
                }}
                rows={2}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // StatCard: { target, suffix, ariaLabel, description }
  if (typeof first === 'object' && first !== null && 'target' in first && 'suffix' in first) {
    return (
      <div className="list-editor">
        {(value as StatCard[]).map((card, i) => (
          <div key={i} className="list-item">
            <div>
              <p className="list-item-label">Liczba</p>
              <input
                type="text"
                value={String(card.target)}
                onChange={e => {
                  const updated = [...(value as StatCard[])]
                  updated[i] = { ...card, target: Number(e.target.value) || card.target }
                  onChange(updated)
                }}
              />
            </div>
            <div>
              <p className="list-item-label">Suffix (np. lat, %)</p>
              <input
                type="text"
                value={card.suffix}
                onChange={e => {
                  const updated = [...(value as StatCard[])]
                  updated[i] = { ...card, suffix: e.target.value }
                  onChange(updated)
                }}
              />
            </div>
            <div>
              <p className="list-item-label">Opis</p>
              <input
                type="text"
                value={card.description}
                onChange={e => {
                  const updated = [...(value as StatCard[])]
                  updated[i] = { ...card, description: e.target.value }
                  onChange(updated)
                }}
              />
            </div>
            <div>
              <p className="list-item-label">Źródło — opis (opcjonalne)</p>
              <input
                type="text"
                value={card.sourceLabel ?? ''}
                onChange={e => {
                  const updated = [...(value as StatCard[])]
                  updated[i] = { ...card, sourceLabel: e.target.value }
                  onChange(updated)
                }}
              />
            </div>
            <div>
              <p className="list-item-label">Źródło — link (opcjonalne)</p>
              <input
                type="text"
                value={card.sourceUrl ?? ''}
                onChange={e => {
                  const updated = [...(value as StatCard[])]
                  updated[i] = { ...card, sourceUrl: e.target.value }
                  onChange(updated)
                }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // DeliverableItem: { title, body } — ProcessStep (num+title) already caught above,
  // so anything left with title+body is a deliverable ("Co dostajesz").
  if (typeof first === 'object' && first !== null && 'title' in first && 'body' in first) {
    return (
      <div className="list-editor">
        {(value as DeliverableItem[]).map((item, i) => (
          <div key={i} className="list-item">
            <div>
              <p className="list-item-label">Tytuł</p>
              <input
                type="text"
                value={item.title}
                onChange={e => {
                  const updated = [...(value as DeliverableItem[])]
                  updated[i] = { ...item, title: e.target.value }
                  onChange(updated)
                }}
              />
            </div>
            <div>
              <p className="list-item-label">Opis</p>
              <textarea
                value={item.body}
                onChange={e => {
                  const updated = [...(value as DeliverableItem[])]
                  updated[i] = { ...item, body: e.target.value }
                  onChange(updated)
                }}
                rows={2}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // string[] — textarea newline-separated
  if (typeof first === 'string') {
    return (
      <textarea
        value={(value as string[]).join('\n')}
        onChange={e => onChange(e.target.value.split('\n'))}
        rows={4}
      />
    )
  }

  return null
}

// ── Labels ────────────────────────────────────────────────────────────────────

const PAGE_LABELS: Record<string, string> = {
  index:          'Strona główna',
  kontakt:        'Kontakt',
  portfolio:      'Portfolio',
  proces:         'Jak pracuję',
  'legal-notice': 'Nota prawna',
  'privacy-policy': 'Polityka prywatności',
}

const PAGE_COLORS: Record<string, string> = {
  index:          '#2563eb',
  kontakt:        '#0891b2',
  portfolio:      '#7c3aed',
  proces:         '#059669',
  'legal-notice': '#6b7280',
  'privacy-policy': '#6b7280',
}

const SECTION_LABELS: Record<string, string> = {
  hero:              'Nagłówek główny',
  problem:           'Problem',
  solution:          'Rozwiązanie (System PACTA)',
  portfolio:         'Realizacje',
  process:           'Proces współpracy',
  pricing:           'Cennik',
  'cta-finale':      'Blok końcowy CTA',
  'kontakt-hero':    'Nagłówek kontaktowy',
  'kontakt-formularz': 'Formularz kontaktowy',
  faq:               'FAQ',
  'portfolio-hero':  'Nagłówek portfolio',
  'portfolio-grid':  'Siatka realizacji',
  'proces-hero':     'Nagłówek procesu',
  timeline:          'Oś czasu',
  deliverables:      'Co dostarczam',
  technologie:       'Technologie',
  'cennik-detail':   'Szczegóły cennika',
}

const FIELD_LABELS: Record<string, string> = {
  tag:                 'Tag nad nagłówkiem',
  headline:            'Nagłówek',
  subheadline:         'Podnagłówek',
  subheadlinePrefix:   'Podnagłówek (cena dopisywana automatycznie)',
  lead:                'Lead',
  body1:               'Treść (akapit 1)',
  body2:               'Treść (akapit 2)',
  ctaPrimaryLabel:     'CTA główny (tekst przycisku)',
  ctaSecondaryLabel:   'CTA drugorzędny (tekst przycisku)',
  ctaMicrocopy:        'Mikrokopia pod CTA',
  reassurance1:        'Powód 1 (dlaczego warto napisać)',
  reassurance2:        'Powód 2 (dlaczego warto napisać)',
  reassurance3:        'Powód 3 (dlaczego warto napisać)',
  microcopy:           'Mikrokopia',
  sectionLabel:        'Etykieta sekcji',
  checklistTag:        'Tag karty PACTA',
  checklistItems:      'Elementy listy PACTA',
  stats:               'Statystyki',
  symptomCards:        'Karty problemów',
  cards:               'Realizacje (karty)',
  steps:               'Kroki procesu',
  standard:            'Pakiet standardowy',
  premium:             'Pakiet premium',
  items:               'Elementy',
  questions:           'Pytania FAQ',
  tags:                'Technologie (każda w osobnej linii)',
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function FieldsForm({ initialModel }: Props) {
  const [model, setModel] = useState<SiteModel>(() => {
    const m: SiteModel = JSON.parse(JSON.stringify(initialModel))
    // Ensure every portfolio card has a stable id (assigned once, persisted on first save)
    for (const page of m.pages) {
      for (const sectionId of ['portfolio', 'portfolio-grid']) {
        const portfolioSection = page.sections.find(s => s.id === sectionId)
        if (Array.isArray(portfolioSection?.fields.cards?.value)) {
          portfolioSection.fields.cards.value = (portfolioSection.fields.cards.value as PortfolioCard[])
            .map(c => c.id ? c : { ...c, id: crypto.randomUUID() })
        }
      }
    }
    return m
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalErrors, setGeneralErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<Violation[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle')
  const [isPending, startTransition] = useTransition()

  function updateField(pageSlug: string, sectionId: string, fieldName: string, value: unknown) {
    setModel(m => setFieldValue(m, pageSlug, sectionId, fieldName, value))
    setSaveStatus('idle')
  }

  function updateMeta(key: 'contactPhone' | 'contactPhoneDisplay' | 'contactEmail', value: string) {
    setModel(m => ({ ...m, meta: { ...m.meta, [key]: value } }))
    setSaveStatus('idle')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    setGeneralErrors([])
    setSaveStatus('idle')

    startTransition(async () => {
      // ── guard: catch unhandled throws from saveFields ─────────────────────
      // Without try/catch, any throw (ZodError, Prisma error, expired session,
      // Server Action serialisation failure) is silently swallowed by React's
      // startTransition — the button just re-enables with no feedback to the user.
      let result: Awaited<ReturnType<typeof saveFields>>
      try {
        result = await saveFields(model)
      } catch (e) {
        console.error('[FORMA] saveFields threw an unhandled error:', e)
        setGeneralErrors(['Wystąpił błąd zapisu — spróbuj ponownie. Szczegóły w konsoli przeglądarki (F12).'])
        return
      }

      if (!result.success) {
        const errs: Record<string, string> = {}
        const unmatched: string[] = []

        for (const v of result.errors) {
          // Build a reverse lookup: for each rendered (sectionId, fieldName) pair,
          // check if this violation belongs there.
          // A violation belongs to a field if its path equals "sectionId.fieldName"
          // or starts with "sectionId.fieldName." (subfield).
          let matched = false
          for (const page of model.pages) {
            for (const section of page.sections) {
              for (const [fieldName, field] of Object.entries(section.fields)) {
                if (!field.editable) continue
                const prefix = `${section.id}.${fieldName}`
                if (v.field === prefix || v.field.startsWith(prefix + '.')) {
                  errs[v.field] = v.message
                  matched = true
                }
              }
            }
          }
          if (!matched) unmatched.push(v.message)
        }

        setFieldErrors(errs)
        setGeneralErrors(unmatched)
        return
      }

      setWarnings(result.warnings)
      setSaveStatus('saved')
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', marginBottom: '28px' }}>
        Edycja treści
      </h1>

      {generalErrors.length > 0 && (
        <div className="alert-error">
          <strong>Błędy zapisu:</strong>
          <ul style={{ marginTop: '6px', paddingLeft: '20px' }}>
            {generalErrors.map((msg, i) => <li key={i}>{msg}</li>)}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="warnings">
          <strong>Ostrzeżenia</strong>
          <ul>
            {warnings.map((w, i) => <li key={i}>{w.message}</li>)}
          </ul>
        </div>
      )}

      {/* ── Dane kontaktowe ── */}
      <div className="section-block">
        <p className="section-title">Dane kontaktowe</p>

        <div className="field-row">
          <label className="field-label">Numer telefonu (tel: link)</label>
          <input
            type="text"
            placeholder="+48123456789"
            value={model.meta.contactPhone}
            onChange={e => updateMeta('contactPhone', e.target.value)}
          />
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '4px' }}>
            Używany w href=&quot;tel:…&quot; — bez spacji, np. +48123456789
          </p>
        </div>

        <div className="field-row">
          <label className="field-label">Numer telefonu (wyświetlany)</label>
          <input
            type="text"
            placeholder="123 456 789"
            value={model.meta.contactPhoneDisplay}
            onChange={e => updateMeta('contactPhoneDisplay', e.target.value)}
          />
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '4px' }}>
            Tekst widoczny dla użytkownika, np. 123 456 789
          </p>
        </div>

        <div className="field-row">
          <label className="field-label">Adres e-mail</label>
          <input
            type="text"
            placeholder="kontakt@kancelaria.pl"
            value={model.meta.contactEmail}
            onChange={e => updateMeta('contactEmail', e.target.value)}
          />
        </div>
      </div>

      {model.pages.map(page => {
        const editableSections = page.sections.filter(s =>
          Object.values(s.fields).some(f => f.editable)
        )
        if (editableSections.length === 0) return null

        const pageColor = PAGE_COLORS[page.slug] ?? '#6b7280'
        const pageLabel = PAGE_LABELS[page.slug] ?? page.slug

        return (
          <div key={page.slug} style={{ marginBottom: '8px' }}>
            {/* Page group header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '18px 0 10px',
              borderTop: '2px solid var(--border)',
              marginTop: '8px',
            }}>
              <span style={{
                display: 'inline-block',
                width: '4px',
                height: '20px',
                background: pageColor,
                borderRadius: '2px',
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: 'Georgia, serif',
                fontSize: '1rem',
                fontWeight: 400,
                color: 'var(--fg)',
                letterSpacing: '0.02em',
              }}>
                {pageLabel}
              </span>
            </div>

            {editableSections.map(section => {
              const editableEntries = Object.entries(section.fields).filter(([, f]) => f.editable)

              return (
                <div key={`${page.slug}/${section.id}`} style={{
                  borderLeft: `3px solid ${pageColor}`,
                  paddingLeft: '16px',
                  marginBottom: '24px',
                  paddingBottom: '4px',
                }}>
                  <p style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '0.75rem',
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    color: pageColor,
                    marginBottom: '16px',
                    marginTop: '16px',
                    opacity: 0.85,
                  }}>
                    {SECTION_LABELS[section.id] ?? section.id}
                  </p>

                  {editableEntries.map(([fieldName, field]) => {
                    const { row: rowError, sub: subErrors } = matchErrors(fieldErrors, section.id, fieldName)

                    return (
                      <div key={fieldName} className="field-row">
                        <label className="field-label">
                          {FIELD_LABELS[fieldName] ?? fieldName}
                        </label>

                        {(field.type === 'text' || field.type === 'cta' || field.type === 'contact') && (
                          <>
                            <input
                              type="text"
                              className={rowError ? 'error' : ''}
                              value={String(field.value ?? '')}
                              onChange={e => updateField(page.slug, section.id, fieldName, e.target.value)}
                            />
                            {rowError && <p className="field-error">{rowError}</p>}
                          </>
                        )}

                        {field.type === 'richtext' && (
                          <>
                            <textarea
                              className={rowError ? 'error' : ''}
                              value={String(field.value ?? '')}
                              onChange={e => updateField(page.slug, section.id, fieldName, e.target.value)}
                              rows={4}
                            />
                            {rowError && <p className="field-error">{rowError}</p>}
                          </>
                        )}

                        {field.type === 'price' && (
                          <PriceEditor
                            value={field.value as PricingPackage}
                            errors={subErrors}
                            onChange={v => updateField(page.slug, section.id, fieldName, v)}
                          />
                        )}

                        {field.type === 'list' && (
                          <>
                            {(() => {
                              const arr = field.value as unknown[]
                              const isPortfolioCards =
                                Array.isArray(arr) &&
                                arr.length > 0 &&
                                typeof (arr[0] as PortfolioCard).label === 'string' &&
                                typeof (arr[0] as PortfolioCard).title === 'string'
                              if (isPortfolioCards) {
                                const isGrid = section.id === 'portfolio-grid'
                                const showLink = isGrid || section.id === 'portfolio'
                                return (
                                  <PortfolioCardsEditor
                                    cards={arr as PortfolioCard[]}
                                    onChange={v => updateField(page.slug, section.id, fieldName, v)}
                                    maxCards={isGrid ? 12 : 4}
                                    showLinkField={showLink}
                                  />
                                )
                              }
                              return (
                                <ListEditor
                                  value={arr}
                                  onChange={v => updateField(page.slug, section.id, fieldName, v)}
                                />
                              )
                            })()}
                            {rowError && <p className="field-error">{rowError}</p>}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )
      })}

      <div className="form-actions">
        <button type="submit" className="btn" disabled={isPending}>
          {isPending ? 'Zapisywanie…' : 'Zapisz zmiany'}
        </button>
        <a href="/preview" target="_blank" className="btn btn-ghost">Podgląd</a>
        <DownloadZipButton />
        {saveStatus === 'saved' && <span className="save-status">Zapisano.</span>}
      </div>
    </form>
  )
}
