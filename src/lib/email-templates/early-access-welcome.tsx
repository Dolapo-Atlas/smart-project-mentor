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
  referral_code?: string
}

const EarlyAccessWelcome = ({ name, referral_code }: Props) => {
  const firstName = (name || '').trim().split(/\s+/)[0] || 'there'
  const inviteUrl = referral_code
    ? `https://atlassim.co/invite/${referral_code}`
    : 'https://atlassim.co'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Welcome to Atlas — your first day is getting closer.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandBar}>
            <Text style={brandMark}>ATLAS</Text>
          </Section>

          <Heading style={h1}>Welcome aboard.</Heading>

          <Text style={lead}>Hi {firstName},</Text>
          <Text style={body}>
            We're delighted you've joined the Atlas Founder Cohort.
          </Text>
          <Text style={body}>
            Atlas was created to solve a simple problem. Many aspiring Project
            Coordinators, PMOs, Business Analysts and Project Managers learn
            the theory, but never experience what it's actually like to work
            inside a live project.
          </Text>
          <Text style={body}>Atlas changes that.</Text>
          <Text style={body}>
            Soon, you'll step into realistic projects, work with AI
            stakeholders, manage priorities, respond to emails, solve problems
            and build the confidence employers expect.
          </Text>
          <Text style={body}>
            Before launch, we'll send you your onboarding pack and invite you
            to your very first project.
          </Text>

          <Section style={card}>
            <Text style={cardLabel}>Founder Cohort</Text>
            <Text style={cardTitle}>Your workspace is being prepared.</Text>
            <Text style={cardBody}>
              We'll see you on your first day.
            </Text>
          </Section>

          {referral_code ? (
            <>
              <Hr style={hr} />
              <Text style={smallLabel}>Your Founder invite link</Text>
              <Text style={link}>{inviteUrl}</Text>
              <Text style={hint}>
                Share it with someone breaking into Project Management.
              </Text>
            </>
          ) : null}

          <Hr style={hr} />
          <Text style={signoff}>— The Atlas Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: EarlyAccessWelcome,
  subject: 'Welcome to Atlas.',
  displayName: 'Founder Cohort Welcome',
  previewData: { name: 'Alex Morgan', referral_code: 'AB12CD' },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif',
  color: '#1a1a1a',
}
const container = { padding: '40px 32px', maxWidth: '560px' }
const brandBar = { paddingBottom: '24px' }
const brandMark = {
  fontSize: '12px',
  letterSpacing: '0.32em',
  color: '#b45309',
  margin: 0,
  fontWeight: 600 as const,
}
const h1 = {
  fontSize: '28px',
  lineHeight: '1.15',
  letterSpacing: '-0.01em',
  color: '#0f0f0f',
  margin: '0 0 24px',
  fontWeight: 500 as const,
}
const lead = { fontSize: '15px', color: '#1a1a1a', margin: '0 0 12px' }
const body = {
  fontSize: '15px',
  lineHeight: '1.65',
  color: '#3f3f3f',
  margin: '0 0 14px',
}
const card = {
  marginTop: '28px',
  border: '1px solid #f0e6d2',
  borderRadius: '14px',
  padding: '22px 24px',
  backgroundColor: '#fdf8ee',
}
const cardLabel = {
  fontSize: '11px',
  letterSpacing: '0.2em',
  color: '#b45309',
  textTransform: 'uppercase' as const,
  margin: '0 0 6px',
  fontWeight: 600 as const,
}
const cardTitle = {
  fontSize: '17px',
  color: '#0f0f0f',
  margin: '0 0 6px',
  fontWeight: 500 as const,
}
const cardBody = { fontSize: '14px', color: '#5a4a2e', margin: 0 }
const smallLabel = {
  fontSize: '11px',
  letterSpacing: '0.18em',
  color: '#6b6b6b',
  textTransform: 'uppercase' as const,
  margin: '0 0 6px',
  fontWeight: 600 as const,
}
const link = {
  fontSize: '14px',
  color: '#b45309',
  margin: '0 0 6px',
  fontWeight: 500 as const,
}
const hint = { fontSize: '13px', color: '#6b6b6b', margin: 0 }
const hr = { borderColor: '#ececec', margin: '28px 0' }
const signoff = { fontSize: '14px', color: '#3f3f3f', margin: 0 }