import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/unsubscribe')({
  component: UnsubscribePage,
})

function UnsubscribePage() {
  const [state, setState] = useState<
    'loading' | 'ready' | 'already' | 'invalid' | 'submitting' | 'done' | 'error'
  >('loading')
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token')
    if (!t) {
      setState('invalid')
      return
    }
    setToken(t)
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.valid) setState('ready')
        else if (data?.reason === 'already_unsubscribed') setState('already')
        else setState('invalid')
      })
      .catch(() => setState('error'))
  }, [])

  async function confirm() {
    if (!token) return
    setState('submitting')
    try {
      const res = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (data?.success) setState('done')
      else if (data?.reason === 'already_unsubscribed') setState('already')
      else setState('error')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">Unsubscribe</h1>
        {state === 'loading' && (
          <p className="mt-3 text-sm text-muted-foreground">Checking your link…</p>
        )}
        {state === 'invalid' && (
          <p className="mt-3 text-sm text-muted-foreground">
            This unsubscribe link is invalid or has expired.
          </p>
        )}
        {state === 'already' && (
          <p className="mt-3 text-sm text-muted-foreground">
            You're already unsubscribed. No further emails will be sent.
          </p>
        )}
        {state === 'ready' && (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Click below to confirm you want to stop receiving emails from Atlas.
            </p>
            <button
              onClick={confirm}
              className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Confirm unsubscribe
            </button>
          </>
        )}
        {state === 'submitting' && (
          <p className="mt-3 text-sm text-muted-foreground">Processing…</p>
        )}
        {state === 'done' && (
          <p className="mt-3 text-sm text-muted-foreground">
            You've been unsubscribed. We're sorry to see you go.
          </p>
        )}
        {state === 'error' && (
          <p className="mt-3 text-sm text-destructive">
            Something went wrong. Please try again later.
          </p>
        )}
      </div>
    </div>
  )
}