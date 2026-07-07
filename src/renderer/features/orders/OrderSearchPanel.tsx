import { useTranslation } from 'react-i18next'
import { Button, Select, DatePicker } from '../../components'
import { formatOrderDate as formatDate } from '../../utils'
import type { FeatureKey } from '../../../shared/editions'
import type { RoomType } from '../../../shared/types'

interface SearchState {
  keyword: string
  checkInPreset: string | null
  checkInFrom: string
  checkInTo: string
  checkOutPreset: string | null
  checkOutFrom: string
  checkOutTo: string
  status: string
  roomType: string
}

const PRESET_KEYS = ['today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth']

const datePresets: Record<string, () => { from: string; to: string }> = {
  today: () => { const d = new Date(); const s = formatDate(d); return { from: s, to: s } },
  yesterday: () => { const d = new Date(); d.setDate(d.getDate() - 1); const s = formatDate(d); return { from: s, to: s } },
  thisWeek: () => {
    const d = new Date(); const day = d.getDay() || 7
    const monday = new Date(d); monday.setDate(d.getDate() - day + 1)
    return { from: formatDate(monday), to: formatDate(new Date(monday.getTime() + 6 * 86400000)) }
  },
  lastWeek: () => {
    const d = new Date(); const day = d.getDay() || 7
    const monday = new Date(d); monday.setDate(d.getDate() - day - 6)
    return { from: formatDate(monday), to: formatDate(new Date(monday.getTime() + 6 * 86400000)) }
  },
  thisMonth: () => {
    const d = new Date()
    return { from: formatDate(new Date(d.getFullYear(), d.getMonth(), 1)), to: formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }
  },
  lastMonth: () => {
    const d = new Date()
    return { from: formatDate(new Date(d.getFullYear(), d.getMonth() - 1, 1)), to: formatDate(new Date(d.getFullYear(), d.getMonth(), 0)) }
  },
}

interface Props {
  search: SearchState
  setSearch: (updater: (prev: SearchState) => SearchState) => void
  showAdvanced: boolean
  setShowAdvanced: (v: boolean) => void
  roomTypes: RoomType[]
  hasFeature: (feature: FeatureKey) => boolean
}

export default function OrderSearchPanel({ search, setSearch, showAdvanced, setShowAdvanced, roomTypes, hasFeature }: Props) {
  const { t } = useTranslation()

  const PRESET_LABELS: Record<string, string> = {
    today: t('orders.today'), yesterday: t('orders.yesterday'), thisWeek: t('orders.thisWeek'),
    lastWeek: t('orders.lastWeek'), thisMonth: t('orders.thisMonth'), lastMonth: t('orders.lastMonth'),
  }

  const handlePreset = (field: 'checkIn' | 'checkOut', preset: string) => {
    const dates = datePresets[preset]()
    setSearch(prev => {
      const isActive = (prev as unknown as Record<string, unknown>)[`${field}Preset`] === preset
      return { ...prev, [`${field}Preset`]: isActive ? null : preset, [`${field}From`]: isActive ? '' : dates.from, [`${field}To`]: isActive ? '' : dates.to }
    })
  }

  const clearDateField = (field: 'checkIn' | 'checkOut') => {
    setSearch(prev => ({ ...prev, [`${field}Preset`]: null, [`${field}From`]: '', [`${field}To`]: '' }))
  }

  const hasActiveAdvanced = search.checkInFrom || search.checkInTo || search.checkOutFrom || search.checkOutTo || search.roomType !== 'ALL'

  const DateSection = ({ label, field, presetValue, dateFrom, dateTo, onDateFrom, onDateTo }: {
    label: string; field: 'checkIn' | 'checkOut'; presetValue: string | null
    dateFrom: string; dateTo: string; onDateFrom: (v: string) => void; onDateTo: (v: string) => void
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {PRESET_KEYS.map(preset => (
          <button key={preset} onClick={() => handlePreset(field, preset)}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${presetValue === preset ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {PRESET_LABELS[preset]}
          </button>
        ))}
        {dateFrom && (
          <button onClick={() => clearDateField(field)} className="px-2.5 py-1 text-xs rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">{t('orders.clear')}</button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <DatePicker value={dateFrom} onChange={onDateFrom} className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
        <span className="text-sm text-gray-400">{t('finance.to')}</span>
        <DatePicker value={dateTo} onChange={onDateTo} className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
      </div>
    </div>
  )

  if (!hasFeature('order.advancedSearch')) return null

  return (
    <>
      <button onClick={() => setShowAdvanced(!showAdvanced)}
        className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg border transition-colors ${showAdvanced || hasActiveAdvanced ? 'border-primary-500 text-primary-600 bg-primary-50' : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800'}`}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
        </svg>
        {t('orders.advancedSearch')}
        <svg className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {showAdvanced && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
          <DateSection label={t('orders.checkInDate')} field="checkIn" presetValue={search.checkInPreset}
            dateFrom={search.checkInFrom} dateTo={search.checkInTo}
            onDateFrom={(v) => setSearch(prev => ({ ...prev, checkInFrom: v, checkInPreset: null }))}
            onDateTo={(v) => setSearch(prev => ({ ...prev, checkInTo: v, checkInPreset: null }))} />
          <DateSection label={t('orders.checkOutDate')} field="checkOut" presetValue={search.checkOutPreset}
            dateFrom={search.checkOutFrom} dateTo={search.checkOutTo}
            onDateFrom={(v) => setSearch(prev => ({ ...prev, checkOutFrom: v, checkOutPreset: null }))}
            onDateTo={(v) => setSearch(prev => ({ ...prev, checkOutTo: v, checkOutPreset: null }))} />
          <div className="grid grid-cols-2 gap-4">
            <Select label={t('orders.statusCol')} value={search.status} onChange={e => setSearch(prev => ({ ...prev, status: e.target.value }))}>
              <option value="ALL">{t('orders.status.all')}</option>
              <option value="IN_HOUSE">{t('orders.status.inHouse')}</option>
              <option value="PREBOOK">{t('orders.status.prebook')}</option>
              <option value="CHECKED_OUT">{t('orders.status.checkedOut')}</option>
            </Select>
            <Select label={t('orders.roomType')} value={search.roomType} onChange={e => setSearch(prev => ({ ...prev, roomType: e.target.value }))}>
              <option value="ALL">{t('orders.status.all')}</option>
              {roomTypes.map(rt => <option key={rt.type_id} value={rt.type_name}>{rt.type_name}</option>)}
            </Select>
          </div>
          <div className="flex justify-between pt-1">
            <Button variant="ghost" size="sm" onClick={() => setSearch(prev => ({ ...prev, keyword: '', checkInPreset: null, checkInFrom: '', checkInTo: '', checkOutPreset: null, checkOutFrom: '', checkOutTo: '', status: 'ALL', roomType: 'ALL' }))}>{t('common.reset')}</Button>
            <Button size="sm" onClick={() => setShowAdvanced(false)}>{t('common.search')}</Button>
          </div>
        </div>
      )}
    </>
  )
}
