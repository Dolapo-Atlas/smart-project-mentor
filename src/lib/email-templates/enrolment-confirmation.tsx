import * as React from 'react'
import {
  Body,
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
  name?: string
  amount?: string
  reference?: string
}

const EnrolmentConfirmation = ({ name, amount, reference }: Props) => {
  const firstName = (name || '').trim().split(/\s+/)[0] || 'there'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your Atlas Project Readiness Experience is ready.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>ATLAS</Text>
          <Heading style={h1}>You're enrolled.</Heading>
          <Text style={text}>Hi {firstName},</Text>
          <Text style={text}>
            Your payment for the Atlas Project Readiness Experience is confirmed
            {amount ? ` (${amount})` : ''}. You now have access to the Digital Care Records Rollout
            in the simulated role of Project Coordinator.
          </Text>
          <Section style={card}>
            <Text style={cardTitle}>Your first assignment is ready</Text>
            <Text style={cardBody}>
              Your Programme Manager has sent you an email that requires a response. Sign in and
              open it to complete Task 1.
            </Text>
          </Section>
          <Text style={text}>
            Start here: https://atlassim.co/app
          </Text>
          {reference ? <Text style={small}>Payment reference: {reference}</Text> : null}
          <Text style={small}>
            Atlas provides simulated workplace experience. It does not represent employment.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: EnrolmentConfirmation,
  subject: 'Your Atlas experience is ready',
  displayName: 'Enrolment confirmation',
  previewData: { name: 'Dolapo Rasaq', amount: '₦10,000', reference: 'ATLAS-NI-ABC123' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const brand = { fontSize: '13px', letterSpacing: '3px', color: '#0B132B', fontWeight: 700 as const }
const h1 = { fontSize: '26px', color: '#0B132B', margin: '12px 0 8px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#3f3f46' }
const card = {
  border: '1px solid #e7e5e4',
  borderRadius: '10px',
  padding: '16px 18px',
  margin: '18px 0',
}
const cardTitle = { fontSize: '15px', fontWeight: 600 as const, color: '#0B132B', margin: 0 }
const cardBody = { fontSize: '14px', lineHeight: '22px', color: '#57534e', margin: '6px 0 0' }
const small = { fontSize: '12px', lineHeight: '18px', color: '#78716c' }