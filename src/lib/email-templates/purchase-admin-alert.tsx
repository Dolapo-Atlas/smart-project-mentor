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
  price_id?: string
  started_at?: string
}

const Row = ({ label, value }: { label: string; value?: string }) => (
  <Text style={rowText}>
    <strong>{label}:</strong> {value || '—'}
  </Text>
)

const PurchaseAdminAlert = ({
  name,
  email,
  plan,
  amount,
  region,
  price_id,
  started_at,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New Atlas purchase{name ? ` — ${name}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New Atlas purchase</Heading>
        <Text style={text}>Someone just unlocked the full experience with a one-time payment.</Text>
        <Section style={card}>
          <Row label="Name" value={name} />
          <Row label="Email" value={email} />
          <Row label="Product" value={plan} />
          <Row label="Amount" value={amount} />
          <Row label="Region" value={region} />
          <Row label="Price ID" value={price_id} />
          <Row label="Paid at" value={started_at} />
        </Section>
        <Hr style={hr} />
        <Text style={footer}>Sent automatically by Atlas.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PurchaseAdminAlert,
  subject: 'New Atlas purchase',
  displayName: 'Purchase alert (admin)',
  to: 'rasaqdolapo@gmail.com',
  previewData: {
    name: 'Dolapo Rasaq',
    email: 'learner@example.com',
    plan: 'Atlas Project Readiness Experience',
    amount: '£24.99',
    region: 'international',
    price_id: 'atlas_onetime_gbp',
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