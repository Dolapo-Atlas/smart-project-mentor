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
  plan?: string
  amount?: string
}

const SubscriptionWelcome = ({ name, plan, amount }: Props) => {
  const firstName = (name || '').trim().split(/\s+/)[0] || 'there'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your full Atlas experience is now open.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>ATLAS</Text>
          <Heading style={h1}>You're in. The whole project is open.</Heading>
          <Text style={text}>Hi {firstName},</Text>
          <Text style={text}>
            Your subscription is active{plan ? ` (${plan}` : ''}
            {plan && amount ? `, ${amount}` : ''}
            {plan ? ')' : ''}. Everything you'd built in the preview is still there — nothing
            resets.
          </Text>
          <Section style={card}>
            <Text style={cardTitle}>What just unlocked</Text>
            <Text style={cardBody}>
              The Digital Care Records project from initiation through closure, every deliverable
              template (charter, schedule, WBS, RAID, RACI, status reports), live stakeholders and
              escalations, Steering Committee gates, AI reviewer feedback on everything you submit,
              your performance report, and your verifiable Atlas credential.
            </Text>
          </Section>
          <Text style={text}>
            Pick up where you stopped: https://atlassim.co/app
          </Text>
          <Text style={small}>
            You can manage or cancel your subscription any time from Unlock → Manage my
            subscription inside Atlas.
          </Text>
          <Text style={small}>
            Atlas provides simulated workplace experience. It does not represent employment.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SubscriptionWelcome,
  subject: 'Your full Atlas experience is open',
  displayName: 'Subscription welcome',
  previewData: { name: 'Dolapo Rasaq', plan: 'Monthly', amount: '£10' },
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
  margin: '0 0 20px',
}
const cardTitle = { fontSize: '14px', color: '#0B132B', fontWeight: 600 as const, margin: '0 0 8px' }
const cardBody = { fontSize: '14px', color: '#3f3f3f', margin: 0, lineHeight: '1.6' }
const small = { fontSize: '12px', color: '#6b6b6b', margin: '0 0 8px' }