import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/invite/$code')({
  component: InviteLanding,
})

function InviteLanding() {
  const { code } = Route.useParams()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    try {
      if (code) window.localStorage.setItem('atlas_ref', code.toUpperCase())
    } catch {
      // ignore
    }
    setReady(true)
  }, [code])
  if (!ready) return null
  return <Navigate to="/" hash="early-access" replace />
}