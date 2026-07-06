import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Input, Select, DatePicker } from '../../components'
import { useEdition } from '../../hooks/useEdition'
import { useDialogs } from '../../components/useDialogs'
import { formatOrderDate as formatDate } from '../../utils'
import type { Order, Room, RoomType } from '../../../shared/types'

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  IN_HOUSE: { bg: 'bg-red-100', text: 'text-red-700' },
  PREBOOK: { bg: 'bg-blue-100', text: 'text-blue-700' },
  CHECKED_OUT: { bg: 'bg-gray-100', text: 'text-gray-600' },
}

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
  today: () => {
    const d = new Date()
    const dateStr = formatDate(d)
    return { from: dateStr, to: dateStr }
  },
  yesterday: () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const dateStr = formatDate(d)
    return { from: dateStr, to: dateStr }
  },
  thisWeek: () => {
    const d = new Date()
    const day = d.getDay() || 7
    const monday = new Date(d)
    monday.setDate(d.getDate() - day + 1)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return { from: formatDate(monday), to: formatDate(sunday) }
  },
  lastWeek: () => {
    const d = new Date()
    const day = d.getDay() || 7
    const lastMonday = new Date(d)
    lastMonday.setDate(d.getDate() - day - 6)
    const lastSunday = new Date(lastMonday)
    lastSunday.setDate(lastMonday.getDate() + 6)
    return { from: formatDate(lastMonday), to: formatDate(lastSunday) }
  },
  thisMonth: () => {
    const d = new Date()
    const first = new Date(d.getFullYear(), d.getMonth(), 1)
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return { from: formatDate(first), to: formatDate(last) }
  },
  lastMonth: () => {
    const d = new Date()
    const first = new Date(d.getFullYear(), d.getMonth() - 1, 1)
    const last = new Date(d.getFullYear(), d.getMonth(), 0)
    return { from: formatDate(first), to: formatDate(last) }
  },
}

const EMPTY_SEARCH: SearchState = {
  keyword: '',
  checkInPreset: null,
  checkInFrom: '',
  checkInTo: '',
  checkOutPreset: null,
  checkOutFrom: '',
  checkOutTo: '',
  status: 'ALL',
  roomType: 'ALL',
}

interface Props {
  onEditOrder: (order: Order, room: Room) => void
  refreshKey?: number
  initialFilter?: string
  initialCheckInDate?: string
}

export default function OrdersPage({ onEditOrder, refreshKey, initialFilter, initialCheckInDate }: Props) {
  const { t } = useTranslation()
  const { hasFeature } = useEdition()
  const { showConfirm, ConfirmComponent } = useDialogs()
  const [orders, setOrders] = useState<Order[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [incidentalMap, setIncidentalMap] = useState<Map<number, number>>(new Map())
  const [filter, setFilter] = useState(initialFilter ?? 'ALL')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [search, setSearch] = useState<SearchState>({ ...EMPTY_SEARCH })
  const [localKey, setLocalKey] = useState(0)

  const STATUS_OPTIONS = useMemo(() => [
    { value: 'ALL', label: t('orders.status.all') },
    { value: 'IN_HOUSE', label: t('orders.status.inHouse') },
    { value: 'PREBOOK', label: t('orders.status.prebook') },
    { value: 'CHECKED_OUT', label: t('orders.status.checkedOut') },
  ], [t])

  const STATUS_LABELS: Record<string, string> = useMemo(() => ({
    IN_HOUSE: t('orders.status.inHouse'),
    PREBOOK: t('orders.status.prebook'),
    CHECKED_OUT: t('orders.status.checkedOut'),
  }), [t])

  const PRESET_LABELS: Record<string, string> = useMemo(() => ({
    today: t('orders.today'),
    yesterday: t('orders.yesterday'),
    thisWeek: t('orders.thisWeek'),
    lastWeek: t('orders.lastWeek'),
    thisMonth: t('orders.thisMonth'),
    lastMonth: t('orders.lastMonth'),
  }), [t])

  useEffect(() => {
    if (initialFilter) setFilter(initialFilter)
    if (initialCheckInDate) {
      setSearch(prev => ({
        ...prev,
        checkInPreset: null,
        checkInFrom: initialCheckInDate,
        checkInTo: initialCheckInDate,
      }))
    }
  }, [initialFilter, initialCheckInDate])

  useEffect(() => {
    Promise.resolve(window.electron.db.getOrders()).then(setOrders)
    Promise.resolve(window.electron.db.getRooms()).then(setRooms)
    Promise.resolve(window.electron.db.getRoomTypes()).then(setRoomTypes)
    Promise.resolve(window.electron.db.getIncidentalSums()).then((rows: { order_id: number; total: number }[]) => {
      const m = new Map<number, number>()
      rows.forEach(r => m.set(r.order_id, r.total))
      setIncidentalMap(m)
    })
  }, [refreshKey, localKey])

  const roomMap = useMemo(() => {
    const m = new Map<number, Room>()
    rooms.forEach(r => m.set(r.room_id, r))
    return m
  }, [rooms])

  const filtered = useMemo(() => {
    let result = orders

    if (filter !== 'ALL') {
      result = result.filter(o => o.status === filter)
    }

    const q = search.keyword.trim().toLowerCase()
    if (q) {
      result = result.filter(order => {
        const room = roomMap.get(order.room_id)
        return (
          order.guest_name?.toLowerCase().includes(q) ||
          order.guest_phone?.toLowerCase().includes(q) ||
          room?.room_number?.toLowerCase().includes(q) ||
          order.check_in_date?.includes(q) ||
          order.check_out_date?.includes(q)
        )
      })
    }

    if (search.checkInFrom) {
      result = result.filter(o => o.check_in_date >= search.checkInFrom)
    }
    if (search.checkInTo) {
      result = result.filter(o => o.check_in_date <= search.checkInTo)
    }

    if (search.checkOutFrom) {
      result = result.filter(o => o.check_out_date >= search.checkOutFrom)
    }
    if (search.checkOutTo) {
      result = result.filter(o => o.check_out_date <= search.checkOutTo)
    }

    if (search.roomType !== 'ALL') {
      result = result.filter(o => {
        const room = roomMap.get(o.room_id)
        return room?.room_type === search.roomType
      })
    }

    return result
  }, [orders, filter, search, roomMap])

  const counts = useMemo(() => ({
    ALL: orders.length,
    IN_HOUSE: orders.filter(o => o.status === 'IN_HOUSE').length,
    PREBOOK: orders.filter(o => o.status === 'PREBOOK').length,
    CHECKED_OUT: orders.filter(o => o.status === 'CHECKED_OUT').length,
  }), [orders])

  const handleDelete = (orderId: number) => {
    showConfirm({
      title: t('common.confirm'),
      message: t('common.confirm'),
      variant: 'danger',
      onConfirm: async () => {
        await window.electron.db.deleteOrder(orderId)
        setLocalKey(k => k + 1)
      },
    })
  }

  const handlePreset = (field: 'checkIn' | 'checkOut', preset: string) => {
    const dates = datePresets[preset]()
    setSearch(prev => ({
      ...prev,
      [`${field}Preset`]: prev[`${field}Preset` as keyof SearchState] === preset ? null : preset,
      [`${field}From`]: prev[`${field}Preset` as keyof SearchState] === preset ? '' : dates.from,
      [`${field}To`]: prev[`${field}Preset` as keyof SearchState] === preset ? '' : dates.to,
    }))
  }

  const clearDateField = (field: 'checkIn' | 'checkOut') => {
    setSearch(prev => ({
      ...prev,
      [`${field}Preset`]: null,
      [`${field}From`]: '',
      [`${field}To`]: '',
    }))
  }

  const resetSearch = () => {
    setSearch({ ...EMPTY_SEARCH })
  }

  const hasActiveAdvanced = search.checkInFrom || search.checkInTo ||
    search.checkOutFrom || search.checkOutTo ||
    search.roomType !== 'ALL'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('orders.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('orders.subtitle')}</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              ${filter === opt.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'}`}
          >
            {opt.label}
            <span className="ml-1.5 text-xs text-gray-400">{counts[opt.value as keyof typeof counts]}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <Input
              type="text"
              placeholder={t('orders.searchPlaceholder')}
              value={search.keyword}
              onChange={e => setSearch(prev => ({ ...prev, keyword: e.target.value }))}
              className="pl-9 pr-9"
            />
            {search.keyword && (
              <button
                onClick={() => setSearch(prev => ({ ...prev, keyword: '' }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {hasFeature('order.advancedSearch') && (
            <button
              onClick={() => setShowAdvanced(v => !v)}
              className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                showAdvanced || hasActiveAdvanced
                  ? 'border-primary-500 text-primary-600 bg-primary-50'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
              </svg>
              {t('orders.advancedSearch')}
              <svg className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          )}
        </div>

        {/* Advanced Search Panel */}
        {showAdvanced && hasFeature('order.advancedSearch') && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
            {/* Check-in date section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('orders.checkInDate')}</label>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {PRESET_KEYS.map(preset => (
                  <button
                    key={preset}
                    onClick={() => handlePreset('checkIn', preset)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      search.checkInPreset === preset
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {PRESET_LABELS[preset]}
                  </button>
                ))}
                {search.checkInFrom && (
                  <button
                    onClick={() => clearDateField('checkIn')}
                    className="px-2.5 py-1 text-xs rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    {t('orders.clear')}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <DatePicker
                  value={search.checkInFrom}
                  onChange={(value) => setSearch(prev => ({ ...prev, checkInFrom: value, checkInPreset: null }))}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
                <span className="text-sm text-gray-400">{t('finance.to')}</span>
                <DatePicker
                  value={search.checkInTo}
                  onChange={(value) => setSearch(prev => ({ ...prev, checkInTo: value, checkInPreset: null }))}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>
            </div>

            {/* Check-out date section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('orders.checkOutDate')}</label>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {PRESET_KEYS.map(preset => (
                  <button
                    key={preset}
                    onClick={() => handlePreset('checkOut', preset)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      search.checkOutPreset === preset
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {PRESET_LABELS[preset]}
                  </button>
                ))}
                {search.checkOutFrom && (
                  <button
                    onClick={() => clearDateField('checkOut')}
                    className="px-2.5 py-1 text-xs rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    {t('orders.clear')}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <DatePicker
                  value={search.checkOutFrom}
                  onChange={(value) => setSearch(prev => ({ ...prev, checkOutFrom: value, checkOutPreset: null }))}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
                <span className="text-sm text-gray-400">{t('finance.to')}</span>
                <DatePicker
                  value={search.checkOutTo}
                  onChange={(value) => setSearch(prev => ({ ...prev, checkOutTo: value, checkOutPreset: null }))}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>
            </div>

            {/* Status + Room type row */}
            <div className="grid grid-cols-2 gap-4">
              <Select
                label={t('orders.statusCol')}
                value={search.status}
                onChange={e => setSearch(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="ALL">{t('orders.status.all')}</option>
                <option value="IN_HOUSE">{t('orders.status.inHouse')}</option>
                <option value="PREBOOK">{t('orders.status.prebook')}</option>
                <option value="CHECKED_OUT">{t('orders.status.checkedOut')}</option>
              </Select>
              <Select
                label={t('orders.roomType')}
                value={search.roomType}
                onChange={e => setSearch(prev => ({ ...prev, roomType: e.target.value }))}
              >
                <option value="ALL">{t('orders.status.all')}</option>
                {roomTypes.map(t => (
                  <option key={t.type_id} value={t.type_name}>{t.type_name}</option>
                ))}
              </Select>
            </div>

            {/* Action buttons */}
            <div className="flex justify-between pt-1">
              <Button variant="ghost" size="sm" onClick={resetSearch}>
                {t('common.reset')}
              </Button>
              <Button size="sm" onClick={() => setShowAdvanced(false)}>
                {t('common.search')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {(search.keyword.trim() || hasActiveAdvanced)
            ? t('orders.noFilteredOrders')
            : filter === 'ALL'
              ? t('orders.noOrders')
              : `暂无${STATUS_OPTIONS.find(o => o.value === filter)?.label}${t('orders.noOrders').replace('暂无', '')}`}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">{t('orders.room')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('orders.guest')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('orders.checkIn')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('orders.checkOut')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('orders.statusCol')}</th>
                <th className="text-right px-4 py-3 font-medium">{t('orders.roomFee')}</th>
                <th className="text-right px-4 py-3 font-medium">{t('orders.deposit')}</th>
                <th className="text-right px-4 py-3 font-medium">{t('orders.incidental')}</th>
                <th className="text-right px-4 py-3 font-medium">{t('orders.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(order => {
                const room = roomMap.get(order.room_id)
                const style = STATUS_STYLES[order.status] || STATUS_STYLES.CHECKED_OUT
                return (
                  <tr key={order.order_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{room?.room_number ?? '?'}</span>
                      <span className="ml-1.5 text-xs text-gray-400">{room?.room_type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{order.guest_name}</div>
                      {order.guest_phone && (
                        <div className="text-xs text-gray-400 mt-0.5">{order.guest_phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{order.check_in_date}</td>
                    <td className="px-4 py-3 text-gray-600">{order.check_out_date}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">¥{order.actual_amount}</td>
                    <td className="px-4 py-3 text-right text-gray-600">¥{order.deposit}</td>
                    <td className="px-4 py-3 text-right text-amber-600">
                      {incidentalMap.has(order.order_id) ? `¥${incidentalMap.get(order.order_id)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => room && onEditOrder(order, room)}
                          className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title={t('common.edit')}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(order.order_id)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title={t('common.delete')}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {ConfirmComponent}
    </div>
  )
}
