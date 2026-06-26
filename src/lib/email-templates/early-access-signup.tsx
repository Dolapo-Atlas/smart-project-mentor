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
  desired_role?: string
  country?: string
  experience_level?: string
  submitted_at?: string
}

const EarlyAccessSignup = ({
  name,
  email,
  desired_role,
  country,
  experience_level,
  submitted_at,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New Atlas early access signup{name ? ` — ${name}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New early access signup</Heading>
        <Text style={text}>Someone just requested early access to Atlas.</Text>
        <Section style={card}>
          <Row label="Name" value={name} />
          <Row label="Email" value={email} />
          <Row label="Desired role" value={desired_role} />
          <Row label="Country" value={country} />
          <Row label="Experience" value={experience_level} />
          {submitted_at ? <Row label="Submitted" value={submitted_at} /> : null}
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          View all signups at https://atlassim.co/admin/signups
        </Text>
      </Container>
    </Body>
  </Html>
)

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <Text style={rowText}>
      <strong>{label}:</strong> {value || '—'}
    </Text>
  )
}

export const template = {
  component: EarlyAccessSignup,
  subject: (data: Record<string, any>) =>
    `New Atlas signup${data?.name ? ` — ${data.name}` : ''}`,
  displayName: 'Early Access Signup Notification',
  to: 'rasaqdolapo@gmail.com',
  previewData: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    desired_role: 'Project Manager',
    country: 'United Kingdom',
    experience_level: '3-5 years',
    submitted_at: new Date().toISOString(),
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