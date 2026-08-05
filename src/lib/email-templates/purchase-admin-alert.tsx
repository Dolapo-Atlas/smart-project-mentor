import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  email?: string
  plan?: string
  amount?: string
  region?: string
  interval?: string
  price_id?: string
  started_at?: string
}

const Row = ({ label, value }: { label: string; value?: string }) => (
  <Text style={rowText}>
    <strong>{label}:</strong> {value || '—'}
  </Text>
)

const SubscriptionAdminAlert = ({
  name,
  email,
  plan,
  amount,
  region,
  interval,
  price_id,
  started_at,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New Atlas subscriber{name ? ` — ${name}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New Atlas subscriber</Heading>
        <Text style={text}>Someone just unlocked the full experience.</Text>
        <Section style={card}>
          <Row label="Name" value={name} />
          <Row label="Email" value={email} />
          <Row label="Plan" value={plan} />
          <Row label="Amount" value={amount} />
          <Row label="Region" value={region} />
          <Row label="Interval" value={interval} />
          <Row label="Price ID" value={price_id} />
          <Row label="Started" value={started_at} />
        </Section>
        <Hr style={hr} />
        <Text style={footer}>Sent automatically by Atlas.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SubscriptionAdminAlert,
  subject: 'New Atlas subscriber',
  displayName: 'Subscriber alert (admin)',
  to: 'rasaqdolapo@gmail.com',
  previewData: {
    name: 'Dolapo Rasaq',
    email: 'learner@example.com',
    plan: 'International monthly',
    amount: '£10',
    region: 'international',
    interval: 'monthly',
    price_id: 'atlas_intl_monthly',
    started_at: new Date().toISOString(),
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', color: '#0f0f0f', margin: '0 0 8px' }
const text = { fontSize: '14px', color: '#3f3f3f', margin: '0 0 16px' }
const card = {
  border: '1px solid #e5e5e5',
  borderRadius: '12px',
  padding: '20px 24px',
  backgroundColor: '#fafaf7',
}
const rowText = { fontSize: '14px', color: '#1f1f1f', margin: '6px 0' }
const hr = { borderColor: '#e5e5e5', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#6b6b6b' }