import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  email?: string
  country?: string
  occurred_at?: string
  activity?: 'signup' | 'login'
}

const AccountActivity = ({ name, email, country, occurred_at, activity = 'login' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{activity === 'signup' ? 'New Atlas account' : 'Atlas sign-in'}{name ? ` — ${name}` : ''}</Preview>
    <Body>
      <Container>
        <Heading>{activity === 'signup' ? 'New Atlas account' : 'Atlas sign-in'}</Heading>
        <Text>{activity === 'signup' ? 'A learner has created an Atlas account.' : 'A learner has signed in to Atlas.'}</Text>
        <Text><strong>Name:</strong> {name || '—'}</Text>
        <Text><strong>Email:</strong> {email || '—'}</Text>
        <Text><strong>Country:</strong> {country || '—'}</Text>
        <Text><strong>Time:</strong> {occurred_at || '—'}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AccountActivity,
  subject: (data: Record<string, any>) =>
    `${data.activity === 'signup' ? 'New Atlas user' : 'Atlas login'}${data.name ? `: ${data.name}` : ''}`,
  displayName: 'Account Activity Notification',
  to: 'rasaqdolapo@gmail.com',
  previewData: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    country: 'United Kingdom',
    activity: 'signup',
    occurred_at: '2026-11-07T22:57:00Z',
  },
} satisfies TemplateEntry