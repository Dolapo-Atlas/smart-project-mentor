import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  pm_name?: string
  project_name?: string
  app_url?: string
}

const CharterNudgeEmail = ({ name, pm_name, project_name, app_url }: Props) => {
  const firstName = name || 'there'
  const pm = pm_name || 'Your Project Manager'
  const project = project_name || 'your project'
  const url = app_url || 'https://atlassim.co'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{pm} is waiting on your first draft of the Project Charter</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>ATLAS</Text>
          <Heading style={heading}>Quick nudge: the Project Charter</Heading>
          <Text style={text}>Hi {firstName},</Text>
          <Text style={text}>
            Thanks again for your reply. The next thing I need from you on {project} is a
            first go at the Project Charter.
          </Text>
          <Text style={text}>
            Don't worry about getting it perfect. Just start with the purpose: what
            problem is this project solving, and why now? Two or three sentences is
            plenty — the step-by-step builder will walk you through the rest.
          </Text>
          <Button style={button} href={url}>
            Open your project
          </Button>
          <Text style={text}>Shout if anything is unclear.</Text>
          <Text style={signoff}>
            {pm}
            <br />
            Atlas Simulation
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CharterNudgeEmail,
  subject: (data: Record<string, any>) =>
    `${data.pm_name || 'Your Project Manager'}: Quick nudge on the Project Charter`,
  displayName: 'Charter nudge',
  previewData: {
    name: 'Jane',
    pm_name: 'Sarah Williams',
    project_name: 'Digital Care Records Rollout',
    app_url: 'https://atlassim.co',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 25px', maxWidth: '560px' }
const brand = {
  fontSize: '13px',
  letterSpacing: '3px',
  fontWeight: 'bold' as const,
  color: '#1e3a5f',
  marginBottom: '24px',
}
const heading = { fontSize: '22px', color: '#1e3a5f', margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#333333' }
const button = {
  backgroundColor: '#1e3a5f',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  margin: '8px 0 16px',
  display: 'inline-block',
}
const signoff = { fontSize: '15px', lineHeight: '22px', color: '#333333', marginTop: '24px' }
