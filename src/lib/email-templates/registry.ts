import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
import { template as earlyAccessSignup } from './early-access-signup'
import { template as earlyAccessWelcome } from './early-access-welcome'
import { template as enrolmentConfirmation } from './enrolment-confirmation'
import { template as unlockConfirmation } from './unlock-confirmation'
import { template as purchaseAdminAlert } from './purchase-admin-alert'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'early-access-signup': earlyAccessSignup,
  'early-access-welcome': earlyAccessWelcome,
  'enrolment-confirmation': enrolmentConfirmation,
  'unlock-confirmation': unlockConfirmation,
  'purchase-admin-alert': purchaseAdminAlert,
}
