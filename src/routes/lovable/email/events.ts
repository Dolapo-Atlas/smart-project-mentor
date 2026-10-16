import { createEmailWebhookHandler } from '@lovable.dev/email-js'
import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'

type TerminalKind = 'bounce' | 'complaint' | 'unsubscribe'

const LOG_STATUS: Record<TerminalKind, 'bounced' | 'complained' | 'suppressed'> = {
  bounce: 'bounced',
  complaint: 'complained',
  unsubscribe: 'suppressed',
}

const LOG_MESSAGE: Record<TerminalKind, string> = {
  bounce: 'Permanent bounce — email address is invalid or rejected',
  complaint: 'Spam complaint — recipient marked email as spam',
  unsubscribe: 'Recipient unsubscribed',
}

/**
 * Records a terminal delivery outcome in the app's own history tables.
 * Notification-only: Lovable already enforces suppression at send time, so
 * nothing here gates future sends. Throws on failure so the delivery retries.
 */
async function recordOutcome(
  kind: TerminalKind,
  event: { event_id: string; data: { recipient: string; message_id?: string | null } },
) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Server configuration error')
  }
  const supabase = createClient(supabaseUrl, serviceKey)
  const email = event.data.recipient.toLowerCase()

  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert({ email, reason: kind, metadata: null }, { onConflict: 'email' })
  if (suppressError) {
    console.error('Failed to record suppression', {
      code: suppressError.code,
      message: suppressError.message,
      event_id: event.event_id,
    })
    throw new Error('Failed to record suppression')
  }

  const { error: logError } = await supabase.from('email_send_log').insert({
    message_id: event.data.message_id ?? null,
    template_name: 'system',
    recipient_email: email,
    status: LOG_STATUS[kind],
    error_message: LOG_MESSAGE[kind],
    metadata: null,
  })
  if (logError) {
    console.error('Failed to record email event', {
      code: logError.code,
      message: logError.message,
      event_id: event.event_id,
    })
    throw new Error('Failed to record email event')
  }
}

export const Route = createFileRoute("/lovable/email/events")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const apiKey = process.env['LOVABLE_API_KEY']
        if (!apiKey) {
          console.error('Missing required environment variables')
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }
        const handler = createEmailWebhookHandler({
          apiKey,
          on: {
            'email.bounced': async (event) => {
              await recordOutcome('bounce', event)
            },
            'email.complaint': async (event) => {
              await recordOutcome('complaint', event)
            },
            'email.unsubscribed': async (event) => {
              await recordOutcome('unsubscribe', event)
            },
          },
        })
        return handler(request)
      },
    },
  },
})
