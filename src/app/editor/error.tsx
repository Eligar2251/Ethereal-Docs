'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function EditorError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[Editor Error]', error)
  }, [error])

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        fontFamily: 'var(--font-ui)',
        padding: 24,
        background: 'var(--color-base)',
      }}
    >
      <AlertTriangle
        size={36}
        strokeWidth={1}
        style={{ color: 'var(--color-ink-faint)', opacity: 0.6 }}
      />
      <div style={{ textAlign: 'center' }}>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--color-ink)',
            marginBottom: 6,
          }}
        >
          Something went wrong
        </h2>
        <p style={{ fontSize: 13, color: 'var(--color-ink-muted)', marginBottom: 20 }}>
          {error.message || 'An unexpected error occurred in the editor.'}
        </p>
        <button
          onClick={reset}
          style={{
            height: 36,
            padding: '0 16px',
            background: 'var(--color-ink)',
            color: 'var(--color-base)',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'var(--font-ui)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RefreshCw size={13} strokeWidth={1.5} />
          Try again
        </button>
      </div>
    </div>
  )
}