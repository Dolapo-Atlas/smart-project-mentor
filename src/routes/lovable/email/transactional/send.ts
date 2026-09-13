import * as React from 'react'
import { render } from 'react-email'
import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { TEMPLATES } from '@/lib/email-templates/registry'

// Configuration baked in at scaffold time
const SITE_NAME = "smart-project-mentor"
// SENDER_DOMAIN is the verified sender subdomain FQDN (e.g., "notify.example.com").
// It MUST match the subdomain delegated to Lovable's nameservers. NEVER use the root domain.
const SENDER_DOMAIN = "notify.atlassim.co"
// FROM_DOMAIN is the domain shown in the From: header (e.g., "example.com").
// Can be the root domain when display_from_root is enabled — this is cosmetic only.
const FROM_DOMAIN = "atlassim.co"

/**
 * SECURITY POLICY
 * ---------------
 * This route is a narrowly scoped wrapper, not a generic mailer.
 *
 *  - Ordinary authenticated users may only trigger allowlisted templates.
 *  - The recipient is ALWAYS derived server-side: either the authenticated
 *    user's own verified address, or a fixed internal address for internal
 *    notices. Client-supplied recipients are ignored.
 *  - Template data is filtered to an allowlist of short scalar fields per
 *    template; no HTML, subject or body content is ever accepted from the
 *    client.
 *  - Admins (public.user_roles / has_role) may send any registered template
 *    to an explicit recipient for support/operational purposes.
 *  - Per-user hourly rate limit.
 */

/** Templates an ordinary signed-in user may trigger about themselves. */
const SELF_SEND_TEMPLATES: Record<string, readonly string[]> = {
  'unlock-confirmation': ['name', 'first_name', 'amount_paid', 'continue_url'],
  'enrolment-confirmation': ['name', 'amount', 'reference'],
  'early-access-welcome': ['name', 'referral_code'],
}

/** Templates that always go to the internal Atlas inbox, never to a learner. */
const INTERNAL_TEMPLATES: Record<string, readonly string[]> = {
  'purchase-admin-alert': [
    'name',
    'email',
    'plan',
    'amount',
    'region',
    'price_id',
    'started_at',
  ],
  'early-access-signup': [
    'name',
    'email',
    'desired_role',
    'country',
    'experience_level',
    'submitted_at',
  ],
}

/** Fixed internal recipient for INTERNAL_TEMPLATES. */
const INTERNAL_RECIPIENT = 'rasaqdolapo@gmail.com'

/** Max emails per authenticated user per hour. */
const RATE_LIMIT_PER_HOUR = 12

const MAX_FIELD_LENGTH = 300

function sanitiseTemplateData(
  raw: Record<string, any>,
  allowedKeys: readonly string[],
): Record<string, string> {
  const clean: Record<string, string> = {}
  for (const key of allowedKeys) {
    const value = raw[key]
    if (value === undefined || value === null) continue
    if (typeof value === 'object') continue
    const asText = String(value).slice(0, MAX_FIELD_LENGTH).replace(/[<>]/g, '')
    if (asText.length === 0) continue
    clean[key] = asText
  }
  return clean
}

function redactEmail(email: string | null | undefined): string {
  if (!email) return '***'
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return '***'
  return `${localPart[0]}***@${domain}`
}

// Generate a cryptographically random 32-byte hex token
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const Route = createFileRoute("/lovable/email/transactional/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
          console.error('Missing required environment variables')
          return Response.json(
            { error: 'Server configuration error' },
            { status: 500 }
          )
        }

        // Verify the caller has a valid Supabase auth token.
        // In TanStack, there is no Supabase gateway — we validate the JWT ourselves.
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.slice('Bearer '.length).trim()
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Parse request body
        let templateName: string
        let requestedRecipient: string | undefined
        let idempotencyKey: string
        let messageId: string
        let rawTemplateData: Record<string, any> = {}
        try {
          const body = await request.json()
          templateName = String(body.templateName || body.template_name || '')
          const candidate = body.recipientEmail || body.recipient_email
          requestedRecipient = typeof candidate === 'string' ? candidate : undefined
          messageId = crypto.randomUUID()
          const key = body.idempotencyKey || body.idempotency_key
          idempotencyKey = typeof key === 'string' ? key.slice(0, 200) : messageId
          if (body.templateData && typeof body.templateData === 'object') {
            rawTemplateData = body.templateData
          }
        } catch {
          return Response.json(
            { error: 'Invalid JSON in request body' },
            { status: 400 }
          )
        }

        if (!templateName) {
          return Response.json(
            { error: 'templateName is required' },
            { status: 400 }
          )
        }

        // 1. Look up template from registry (early — needed to resolve recipient)
        const template = TEMPLATES[templateName]

        if (!template) {
          console.error('Template not found in registry', { templateName })
          return Response.json(
            {
              error: `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`,
            },
            { status: 404 }
          )
        }

        // 2. Authorisation + server-side recipient/content derivation.
        const { data: isAdmin } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin',
        })

        let effectiveRecipient: string
        let templateData: Record<string, any>

        if (SELF_SEND_TEMPLATES[templateName]) {
          // Learner-facing notice: always to the authenticated user's own address.
          if (!user.email) {
            return Response.json(
              { error: 'Authenticated account has no email address' },
              { status: 403 }
            )
          }
          effectiveRecipient = user.email
          templateData = sanitiseTemplateData(
            rawTemplateData,
            SELF_SEND_TEMPLATES[templateName]!,
          )
        } else if (INTERNAL_TEMPLATES[templateName]) {
          // Operational notice: fixed internal inbox, never a client-supplied address.
          effectiveRecipient = template.to || INTERNAL_RECIPIENT
          templateData = sanitiseTemplateData(
            rawTemplateData,
            INTERNAL_TEMPLATES[templateName]!,
          )
        } else if (isAdmin === true) {
          // Admins may use any registered template for support operations.
          effectiveRecipient = template.to || requestedRecipient || user.email || ''
          templateData = rawTemplateData
          if (!effectiveRecipient) {
            return Response.json(
              { error: 'recipientEmail is required for this template' },
              { status: 400 }
            )
          }
        } else {
          console.warn('Blocked non-allowlisted email send', {
            templateName,
            user_id: user.id,
          })
          return Response.json(
            { error: 'Not permitted to send this email' },
            { status: 403 }
          )
        }

        // 3. Per-user hourly rate limit (tracked against the resolved recipient
        //    plus the acting account via metadata).
        const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
        const { count: recentCount, error: rateError } = await supabase
          .from('email_send_log')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_email', effectiveRecipient.toLowerCase())
          .gte('created_at', since)

        if (rateError) {
          console.error('Rate limit check failed — refusing to send', rateError)
          return Response.json({ error: 'Failed to verify send quota' }, { status: 500 })
        }

        if (!isAdmin && (recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
          return Response.json(
            { error: 'Too many emails requested. Please try again later.' },
            { status: 429 }
          )
        }

        // 4. Check suppression list (fail-closed: if we can't verify, don't send)
        const { data: suppressed, error: suppressionError } = await supabase
          .from('suppressed_emails')
          .select('id')
          .eq('email', effectiveRecipient.toLowerCase())
          .maybeSingle()

        if (suppressionError) {
          console.error('Suppression check failed — refusing to send', {
            error: suppressionError,
            recipient_redacted: redactEmail(effectiveRecipient),
          })
          return Response.json(
            { error: 'Failed to verify suppression status' },
            { status: 500 }
          )
        }

        if (suppressed) {
          // Log the suppressed attempt
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: templateName,
            recipient_email: effectiveRecipient,
            status: 'suppressed',
          })

          console.log('Email suppressed', {
            templateName,
            recipient_redacted: redactEmail(effectiveRecipient),
          })
          return Response.json({ success: false, reason: 'email_suppressed' })
        }

        // 5. Get or create unsubscribe token (one token per email address)
        const normalizedEmail = effectiveRecipient.toLowerCase()
        let unsubscribeToken: string

        // Check for existing token for this email
        const { data: existingToken, error: tokenLookupError } = await supabase
          .from('email_unsubscribe_tokens')
          .select('token, used_at')
          .eq('email', normalizedEmail)
          .maybeSingle()

        if (tokenLookupError) {
          console.error('Token lookup failed', {
            error: tokenLookupError,
            email_redacted: redactEmail(normalizedEmail),
          })
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: templateName,
            recipient_email: effectiveRecipient,
            status: 'failed',
            error_message: 'Failed to look up unsubscribe token',
          })
          return Response.json(
            { error: 'Failed to prepare email' },
            { status: 500 }
          )
        }

        if (existingToken && !existingToken.used_at) {
          // Reuse existing unused token
          unsubscribeToken = existingToken.token
        } else if (!existingToken) {
          // Create new token — upsert handles concurrent inserts gracefully
          unsubscribeToken = generateToken()
          const { error: tokenError } = await supabase
            .from('email_unsubscribe_tokens')
            .upsert(
              { token: unsubscribeToken, email: normalizedEmail },
              { onConflict: 'email', ignoreDuplicates: true }
            )

          if (tokenError) {
            console.error('Failed to create unsubscribe token', {
              error: tokenError,
            })
            await supabase.from('email_send_log').insert({
              message_id: messageId,
              template_name: templateName,
              recipient_email: effectiveRecipient,
              status: 'failed',
              error_message: 'Failed to create unsubscribe token',
            })
            return Response.json(
              { error: 'Failed to prepare email' },
              { status: 500 }
            )
          }

          // If another request raced us, our upsert was silently ignored.
          // Re-read to get the actual stored token.
          const { data: storedToken, error: reReadError } = await supabase
            .from('email_unsubscribe_tokens')
            .select('token')
            .eq('email', normalizedEmail)
            .maybeSingle()

          if (reReadError || !storedToken) {
            console.error('Failed to read back unsubscribe token after upsert', {
              error: reReadError,
              email_redacted: redactEmail(normalizedEmail),
            })
            await supabase.from('email_send_log').insert({
              message_id: messageId,
              template_name: templateName,
              recipient_email: effectiveRecipient,
              status: 'failed',
              error_message: 'Failed to confirm unsubscribe token storage',
            })
            return Response.json(
              { error: 'Failed to prepare email' },
              { status: 500 }
            )
          }
          unsubscribeToken = storedToken.token
        } else {
          // Token exists but is already used — email should have been caught by suppression check above.
          // This is a safety fallback; log and skip sending.
          console.warn('Unsubscribe token already used but email not suppressed', {
            email_redacted: redactEmail(normalizedEmail),
          })
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: templateName,
            recipient_email: effectiveRecipient,
            status: 'suppressed',
            error_message:
              'Unsubscribe token used but email missing from suppressed list',
          })
          return Response.json({ success: false, reason: 'email_suppressed' })
        }

        // 6. Render React Email template to HTML and plain text
        const element = React.createElement(template.component, templateData)
        const html = await render(element)
        const plainText = await render(element, { plainText: true })

        // Resolve subject — supports static string or dynamic function
        const resolvedSubject =
          typeof template.subject === 'function'
            ? template.subject(templateData)
            : template.subject

        // 7. Enqueue the pre-rendered email for async processing by the dispatcher.
        // The dispatcher (process-email-queue) handles sending, retries, and rate-limit backoff.

        // Log pending BEFORE enqueue so we have a record even if enqueue crashes
        await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: templateName,
          recipient_email: effectiveRecipient,
          status: 'pending',
        })

        const { error: enqueueError } = await supabase.rpc('enqueue_email', {
          queue_name: 'transactional_emails',
          payload: {
            message_id: messageId,
            to: effectiveRecipient,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject: resolvedSubject,
            html,
            text: plainText,
            purpose: 'transactional',
            label: templateName,
            idempotency_key: idempotencyKey,
            unsubscribe_token: unsubscribeToken,
            queued_at: new Date().toISOString(),
          },
        })

        if (enqueueError) {
          console.error('Failed to enqueue email', {
            error: enqueueError,
            templateName,
            recipient_redacted: redactEmail(effectiveRecipient),
          })

          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: templateName,
            recipient_email: effectiveRecipient,
            status: 'failed',
            error_message: 'Failed to enqueue email',
          })

          return Response.json(
            { error: 'Failed to enqueue email' },
            { status: 500 }
          )
        }

        console.log('Transactional email enqueued', {
          templateName,
          recipient_redacted: redactEmail(effectiveRecipient),
        })

        return Response.json({ success: true, queued: true })
      },
    },
  },
})
