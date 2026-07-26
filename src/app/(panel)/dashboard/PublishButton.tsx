'use client'
import { useState } from 'react'

type Status = 'idle' | 'publishing' | 'done' | 'error'

export default function PublishButton({ variant = 'card' }: { variant?: 'card' | 'inline' } = {}) {
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [url, setUrl] = useState<string | null>(null)

  async function publish() {
    setStatus('publishing')
    setMessage('')
    try {
      const res = await fetch('/api/publish', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        setMessage(data?.error ?? 'Publikacja nie powiodła się.')
        return
      }
      setStatus('done')
      setUrl(data?.url ?? null)
      setMessage(`Opublikowano (${data?.fileCount ?? 0} plików).`)
    } catch {
      setStatus('error')
      setMessage('Brak połączenia z serwerem.')
    }
  }

  // Wariant naglowkowy — zwarty przycisk widoczny na kazdej zakladce panelu.
  if (variant === 'inline') {
    return (
      <div className="publish-inline">
        <button type="button" className="btn" disabled={status === 'publishing'} onClick={publish}>
          {status === 'publishing' ? 'Publikowanie…' : 'Publikuj'}
        </button>
        {status === 'done' && (
          <span className="publish-inline-status">
            {message}{' '}
            {url && <a href={url} target="_blank" rel="noreferrer">Otwórz</a>}
          </span>
        )}
        {status === 'error' && <span className="publish-inline-error">{message}</span>}
      </div>
    )
  }

  return (
    <div className="dashboard-card" style={{ cursor: 'default' }}>
      <p className="dashboard-card-title">Publikacja na żywo</p>
      <p className="dashboard-card-desc">Wysyła aktualną wersję strony na Cloudflare</p>
      <button
        type="button"
        className="btn"
        disabled={status === 'publishing'}
        onClick={publish}
        style={{ marginTop: '12px' }}
      >
        {status === 'publishing' ? 'Publikowanie…' : 'Publikuj'}
      </button>
      {status === 'done' && (
        <p className="save-status" style={{ marginTop: '8px' }}>
          {message}{' '}
          {url && (
            <a href={url} target="_blank" rel="noreferrer">
              Otwórz stronę
            </a>
          )}
        </p>
      )}
      {status === 'error' && (
        <p className="field-error" style={{ marginTop: '8px' }}>
          {message}
        </p>
      )}
    </div>
  )
}
