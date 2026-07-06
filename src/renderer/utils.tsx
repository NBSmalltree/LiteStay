// Date utilities
export function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Get date string for N days ago (inclusive). e.g. daysAgo(1) = today */
export function daysAgo(n: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n + 1)
  return fmtDate(d)
}

/** Format ISO date string to "M/D HH:mm" or similar short display */
export function formatTime(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Format a Date to "M/D" short display */
export function formatShortDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** Order date display (used in OrdersPage) */
export function formatOrderDate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

// Currency
export function fmtCurrency(n: number, locale = 'zh-CN'): string {
  return `¥${n.toLocaleString(locale, { minimumFractionDigits: 0 })}`
}

// Badge class helpers
export function typeBadgeClass(type: string): string {
  switch (type) {
    case 'ROOM_FEE': return 'bg-green-50 text-green-700'
    case 'DEPOSIT':  return 'bg-blue-50 text-blue-700'
    case 'INCIDENTAL': return 'bg-amber-50 text-amber-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

export function paymentMethodBadgeClass(method: string): string {
  switch (method) {
    case 'WeChat': return 'bg-green-50 text-green-700'
    case 'Alipay': return 'bg-blue-50 text-blue-700'
    case 'Cash': return 'bg-amber-50 text-amber-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

// Colors
export const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export const METHOD_COLORS: Record<string, string> = { WeChat: '#07C160', Alipay: '#1677FF', Cash: '#F59E0B' }

export const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  IN_HOUSE: { bg: 'bg-red-100', text: 'text-red-700' },
  PREBOOK: { bg: 'bg-blue-100', text: 'text-blue-700' },
  CHECKED_OUT: { bg: 'bg-gray-100', text: 'text-gray-600' },
}
