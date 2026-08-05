import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  first_name?: string
  name?: string
  /** Already-formatted amount taken from the confirmed payment record. */
  amount_paid?: string
  continue_url?: string
}

const CONTINUE = [
  'Build practical judgement through realistic project situations',
  'Practise responding to stakeholders and changing priorities',
  'Strengthen how you explain project decisions in interviews',
  'See how your decisions affect project health and delivery',
  'Receive structured performance feedback',
  'Complete the programme with a final performance report and verifiable Atlas credential',
]

const UnlockConfirmation = ({ first_name, name, amount_paid, continue_url }: Props) => {
  const firstName =
    (first_name || '').trim() || (name || '').trim().split(/\s+/)[0] || 'there'
  const url = continue_url || 'https://atlassim.co/app'
  const amount = amount_paid || 'your payment'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your full Atlas experience is now unlocked.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>ATLAS</Text>
          <Heading style={h1}>You’re in. The full project is now open.</Heading>
          <Text style={text}>Hi {firstName},</Text>
          <Text style={text}>
            Your one-time payment of {amount} has been confirmed. Your full Atlas Project
            Readiness Experience is now unlocked.
          </Text>
          <Text style={text}>
            Everything you completed during the preview has been saved, so you can continue
            exactly where you stopped.
          </Text>

          <Section style={card}>
            <Text style={cardTitle}>What you can now continue building</Text>
            {CONTINUE.map((line) => (
              <Text key={line} style={bullet}>
                • {line}
              </Text>
            ))}
          </Section>

          <Section style={{ margin: '0 0 24px' }}>
            <Button href={url} style={button}>
              Continue Your Project
            </Button>
          </Section>

          <Section style={receipt}>
            <Text style={receiptRow}>
              <strong>Payment type:</strong> One-time payment
            </Text>
            <Text style={receiptRow}>
              <strong>Amount paid:</strong> {amount}
            </Text>
            <Text style={receiptNote}>No subscription. Nothing renews automatically.</Text>
          </Section>

          <Text style={small}>
            Atlas provides simulated workplace experience. It does not represent employment.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: UnlockConfirmation,
  subject: 'Your full Atlas experience is now unlocked',
  displayName: 'Unlock confirmation (one-time payment)',
  previewData: {
    first_name: 'Dolapo',
    amount_paid: '£24.99',
    continue_url: 'https://atlassim.co/app/charter',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = {
  fontSize: '12px',
  letterSpacing: '0.28em',
  color: '#0B132B',
  margin: '0 0 20px',
  fontWeight: 700 as const,
}
const h1 = { fontSize: '24px', color: '#0B132B', margin: '0 0 16px', lineHeight: '1.25' }
const text = { fontSize: '15px', color: '#3f3f3f', margin: '0 0 16px', lineHeight: '1.6' }
const card = {
  border: '1px solid #e5e5e5',
  borderRadius: '12px',
  padding: '20px 24px',
  backgroundColor: '#fafaf7',
  margin: '0 0 24px',
}
const cardTitle = {
  fontSize: '14px',
  color: '#0B132B',
  fontWeight: 600 as const,
  margin: '0 0 10px',
}
const bullet = { fontSize: '14px', color: '#3f3f3f', margin: '0 0 8px', lineHeight: '1.55' }
const button = {
  backgroundColor: '#E4761B',
  color: '#ffffff',
  borderRadius: '999px',
  padding: '13px 26px',
  fontSize: '15px',
  fontWeight: 600 as const,
  textDecoration: 'none',
}
const receipt = {
  border: '1px solid #e5e5e5',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '0 0 20px',
}
const receiptRow = { fontSize: '14px', color: '#1f1f1f', margin: '4px 0' }
const receiptNote = { fontSize: '13px', color: '#6b6b6b', margin: '8px 0 0' }
const small = { fontSize: '12px', color: '#6b6b6b', margin: '0 0 8px' }
