import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { sendTemplateEmail } from '@/lib/email-templates/send-email'

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  desired_role: z.string().min(1).max(120),
  country: z.string().min(1).max(120),
  experience_level: z.string().min(1).max(60),
  referred_by_code: z.string().min(1).max(32).optional().nullable(),
})

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
          .select('id, created_at, referral_code')
          .single()

        if (insertError) {
          console.error('early-access insert failed', insertError)
          return Response.json({ error: 'Failed to save signup' }, { status: 500 })
        }

        const userReferralCode: string | null = inserted?.referral_code ?? null

        // Helper: render + send a template through managed delivery (best-effort).
        // Suppression and unsubscribe are enforced by Lovable at send time.
        async function sendTemplate(
          templateName: string,
          recipient: string,
          templateData: Record<string, any>,
          idempotencyKey: string,
        ) {
          const recipientLc = recipient.toLowerCase()
          try {
            const result = await sendTemplateEmail(templateName, recipientLc, {
              templateData,
              idempotencyKey,
            })
            const { error: logError } = await supabase.from('email_send_log').insert({
              template_name: templateName,
              recipient_email: recipientLc,
              status: result.sent ? 'sent' : 'suppressed',
            })
            if (logError) console.error('email_send_log insert failed', { error: logError })
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            const { error: logError } = await supabase.from('email_send_log').insert({
              template_name: templateName,
              recipient_email: recipientLc,
              status: 'failed',
              error_message: message.slice(0, 1000),
            })
            if (logError) console.error('email_send_log insert failed', { error: logError })
            throw err
          }
        }

        // 2. Admin notification (best-effort)
        try {
          const adminRecipients = ['rasaqdolapo@gmail.com', 'fuhad.dolapo@gmail.com']
          for (const recipient of adminRecipients) {
            await sendTemplate(
              'early-access-signup',
              recipient,
              { ...parsed, submitted_at: inserted?.created_at ?? new Date().toISOString() },
              `early-access-${inserted?.id}-${recipient}`,
            )
          }
        } catch (err) {
          console.error('early-access notify failed', err)
        }

        // 3. Welcome email to the user (best-effort)
        try {
          await sendTemplate(
            'early-access-welcome',
            parsed.email,
            { name: parsed.name, referral_code: userReferralCode },
            `early-access-welcome-${inserted?.id}`,
          )
        } catch (err) {
          console.error('early-access welcome failed', err)
        }

        return Response.json({ success: true, referral_code: userReferralCode })
      },
    },
  },
})