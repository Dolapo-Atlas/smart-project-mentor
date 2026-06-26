import * as React from 'react'
import { render } from 'react-email'
import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'Atlas'
const SENDER_DOMAIN = 'notify.atlassim.co'
const FROM_DOMAIN = 'atlassim.co'

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  desired_role: z.string().min(1).max(120),
  country: z.string().min(1).max(120),
  experience_level: z.string().min(1).max(60),
})

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const Route = createFileRoute('/api/public/early-access')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceKey) {
          return Response.json({ error: 'Server misconfigured' }, { status: 500 })
        }

        let parsed: z.infer<typeof schema>
        try {
          parsed = schema.parse(await request.json())
        } catch (err: any) {
          return Response.json(
            { error: err?.issues?.[0]?.message ?? 'Invalid input' },
            { status: 400 },
          )
        }

        const supabase = createClient(supabaseUrl, serviceKey)

        // 1. Insert signup
        const { data: inserted, error: insertError } = await supabase
          .from('early_access_signups')
          .insert(parsed)
          .select('id, created_at')
          .single()

        if (insertError) {
          console.error('early-access insert failed', insertError)
          return Response.json({ error: 'Failed to save signup' }, { status: 500 })
        }

        // 2. Fire admin notification email (best-effort — don't fail the signup)
        try {
          const tpl = TEMPLATES['early-access-signup']
          if (!tpl || !tpl.to) throw new Error('Template missing')

          const templateData = {
            ...parsed,
            submitted_at: inserted?.created_at ?? new Date().toISOString(),
          }
          const element = React.createElement(tpl.component, templateData)
          const html = await render(element)
          const text = await render(element, { plainText: true })
          const subject =
            typeof tpl.subject === 'function' ? tpl.subject(templateData) : tpl.subject

          const recipient = tpl.to.toLowerCase()
          const messageId = crypto.randomUUID()

          // Suppression check
          const { data: suppressed } = await supabase
            .from('suppressed_emails')
            .select('id')
            .eq('email', recipient)
            .maybeSingle()

          if (!suppressed) {
            // Ensure unsubscribe token exists
            const { data: existing } = await supabase
              .from('email_unsubscribe_tokens')
              .select('token, used_at')
              .eq('email', recipient)
              .maybeSingle()

            let unsubscribeToken = existing?.token
            if (!existing) {
              unsubscribeToken = generateToken()
              await supabase
                .from('email_unsubscribe_tokens')
                .upsert(
                  { token: unsubscribeToken, email: recipient },
                  { onConflict: 'email', ignoreDuplicates: true },
                )
              const { data: stored } = await supabase
                .from('email_unsubscribe_tokens')
                .select('token')
                .eq('email', recipient)
                .maybeSingle()
              unsubscribeToken = stored?.token ?? unsubscribeToken
            }

            await supabase.from('email_send_log').insert({
              message_id: messageId,
              template_name: 'early-access-signup',
              recipient_email: recipient,
              status: 'pending',
            })

            const { error: enqueueError } = await supabase.rpc('enqueue_email', {
              queue_name: 'transactional_emails',
              payload: {
                message_id: messageId,
                to: recipient,
                from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
                sender_domain: SENDER_DOMAIN,
                subject,
                html,
                text,
                purpose: 'transactional',
                label: 'early-access-signup',
                idempotency_key: `early-access-${inserted?.id ?? messageId}`,
                unsubscribe_token: unsubscribeToken,
                queued_at: new Date().toISOString(),
              },
            })
            if (enqueueError) {
              console.error('enqueue_email failed', enqueueError)
            }
          }
        } catch (err) {
          console.error('early-access notify failed', err)
        }

        return Response.json({ success: true })
      },
    },
  },
})