// Version/edition types and feature matrix for LiteStay

export type Edition = 'trial' | 'basic' | 'pro' | 'ultimate'

export interface EditionInfo {
  edition: Edition
  trialStartDate: string | null
  trialExpired: boolean
  trialDaysRemaining: number | null
  activatedAt: string | null
}

// Feature flags organized by edition tiers
export const FEATURE_MAP = {
  // Page-level: controls sidebar navigation visibility
  'page.roomMatrix':     ['trial', 'basic', 'pro', 'ultimate'],
  'page.roomManagement': ['trial', 'basic', 'pro', 'ultimate'],
  'page.orders':         ['trial', 'basic', 'pro', 'ultimate'],
  'page.overview':       ['pro', 'ultimate'],
  'page.finance':        ['pro', 'ultimate'],
  'page.analytics':      ['ultimate'],
  'page.pricing':        ['pro', 'ultimate'],
  'page.backup':         ['pro', 'ultimate'],
  'page.guests':         ['trial', 'basic', 'pro', 'ultimate'],
  'page.invoices':       ['pro', 'ultimate'],

  // Sub-features within pages
  'guest.sort':              ['pro', 'ultimate'],
  'guest.historyOrders':     ['pro', 'ultimate'],
  'guest.consumptionStats':  ['pro', 'ultimate'],
  'guest.returningGuest':    ['pro', 'ultimate'],
  'guest.fullProfile':       ['ultimate'],
  'guest.preferredRoomType': ['ultimate'],
  'backup.importExport':     ['pro', 'ultimate'],
  'order.advancedSearch':    ['ultimate'],
  'order.datePresets':       ['ultimate'],
  'order.roomTypeFilter':    ['ultimate'],
  'invoice.fullEdit':        ['ultimate'],
  'invoice.viewDetail':      ['ultimate'],
  'invoice.export':          ['ultimate'],
  'pricing.priority':        ['ultimate'],
  'pricing.holidayRules':    ['ultimate'],
  'finance.incomeStats':          ['pro', 'ultimate'],
  'finance.nightAudit':           ['pro', 'ultimate'],
  'finance.excelExport':          ['pro', 'ultimate'],
  'finance.paymentBreakdown':     ['ultimate'],
  'finance.incidentals':          ['ultimate'],
  'finance.nightAuditReport':     ['ultimate'],
  'finance.customDateRange':      ['ultimate'],
} as const

export type FeatureKey = keyof typeof FEATURE_MAP

export function hasFeature(edition: Edition, feature: FeatureKey): boolean {
  return (FEATURE_MAP[feature] as readonly Edition[])?.includes(edition) ?? false
}

const EDITION_RANK: Record<Edition, number> = { trial: 0, basic: 1, pro: 2, ultimate: 3 }

export function editionAtLeast(current: Edition, required: Edition): boolean {
  return EDITION_RANK[current] >= EDITION_RANK[required]
}
