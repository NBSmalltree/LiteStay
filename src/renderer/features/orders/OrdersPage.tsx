import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '../../components'
import { useEdition } from '../../hooks/useEdition'
import { useDialogs } from '../../components/useDialogs'
import OrderSearchPanel from './OrderSearchPanel'
import OrderTable from './OrderTable'
import type { Order, Room, RoomType } from '../../../shared/types'

interface SearchState {
  keyword: string
  checkInPreset: string | null; checkInFrom: string; checkInTo: string
  checkOutPreset: string | null; checkOutFrom: string; checkOutTo: string
  status: string; roomType: string
}

const EMPTY_SEARCH: SearchState = { keyword: '', checkInPreset: null, checkInFrom: '', checkInTo: '', checkOutPreset: null, checkOutFrom: '', checkOutTo: '', status: 'ALL', roomType: 'ALL' }

interface Props { onEditOrder: (order: Order, room: Room) => void; refreshKey?: number; initialFilter?: string; initialCheckInDate?: string }

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
    { value: 'ALL', label: t('orders.status.all') }, { value: 'IN_HOUSE', label: t('orders.status.inHouse') },
    { value: 'PREBOOK', label: t('orders.status.prebook') }, { value: 'CHECKED_OUT', label: t('orders.status.checkedOut') },
  ], [t])

  const STATUS_LABELS: Record<string, string> = useMemo(() => ({ IN_HOUSE: t('orders.status.inHouse'), PREBOOK: t('orders.status.prebook'), CHECKED_OUT: t('orders.status.checkedOut') }), [t])

  useEffect(() => {
    if (initialFilter) setFilter(initialFilter)
    if (initialCheckInDate) setSearch(prev => ({ ...prev, checkInPreset: null, checkInFrom: initialCheckInDate, checkInTo: initialCheckInDate }))
  }, [initialFilter, initialCheckInDate])

  useEffect(() => {
    Promise.resolve(window.electron.db.getOrders()).then(setOrders)
    Promise.resolve(window.electron.db.getRooms()).then(setRooms)
    Promise.resolve(window.electron.db.getRoomTypes()).then(setRoomTypes)
    Promise.resolve(window.electron.db.getIncidentalSums()).then((rows: { order_id: number; total: number }[]) => {
      const m = new Map<number, number>(); rows.forEach(r => m.set(r.order_id, r.total)); setIncidentalMap(m)
    })
  }, [refreshKey, localKey])

  const roomMap = useMemo(() => { const m = new Map<number, Room>(); rooms.forEach(r => m.set(r.room_id, r)); return m }, [rooms])

  const filtered = useMemo(() => {
    let result = orders
    if (filter !== 'ALL') result = result.filter(o => o.status === filter)
    const q = search.keyword.trim().toLowerCase()
    if (q) result = result.filter(o => o.guest_name?.toLowerCase().includes(q) || o.guest_phone?.toLowerCase().includes(q) || roomMap.get(o.room_id)?.room_number?.toLowerCase().includes(q) || o.check_in_date?.includes(q) || o.check_out_date?.includes(q))
    if (search.checkInFrom) result = result.filter(o => o.check_in_date >= search.checkInFrom)
    if (search.checkInTo) result = result.filter(o => o.check_in_date <= search.checkInTo)
    if (search.checkOutFrom) result = result.filter(o => o.check_out_date >= search.checkOutFrom)
    if (search.checkOutTo) result = result.filter(o => o.check_out_date <= search.checkOutTo)
    if (search.roomType !== 'ALL') result = result.filter(o => roomMap.get(o.room_id)?.room_type === search.roomType)
    return result
  }, [orders, filter, search, roomMap])

  const counts = useMemo(() => ({ ALL: orders.length, IN_HOUSE: orders.filter(o => o.status === 'IN_HOUSE').length, PREBOOK: orders.filter(o => o.status === 'PREBOOK').length, CHECKED_OUT: orders.filter(o => o.status === 'CHECKED_OUT').length }), [orders])

  const handleDelete = (orderId: number) => showConfirm({
    title: t('common.confirm'), message: t('common.confirm'), variant: 'danger',
    onConfirm: async () => { await window.electron.db.deleteOrder(orderId); setLocalKey(k => k + 1) },
  })

  const hasActiveAdvanced = !!(search.checkInFrom || search.checkInTo || search.checkOutFrom || search.checkOutTo || search.roomType !== 'ALL')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('orders.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('orders.subtitle')}</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {STATUS_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setFilter(opt.value)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {opt.label}<span className="ml-1.5 text-xs text-gray-400">{counts[opt.value as keyof typeof counts]}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <Input type="text" placeholder={t('orders.searchPlaceholder')} value={search.keyword} onChange={e => setSearch(prev => ({ ...prev, keyword: e.target.value }))} className="pl-9 pr-9" />
            {search.keyword && (
              <button onClick={() => setSearch(prev => ({ ...prev, keyword: '' }))} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <OrderSearchPanel search={search} setSearch={setSearch} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} roomTypes={roomTypes} hasFeature={hasFeature} />
        </div>
      </div>

      <OrderTable filtered={filtered} roomMap={roomMap} incidentalMap={incidentalMap} statusLabels={STATUS_LABELS}
        statusOptions={STATUS_OPTIONS} searchKeyword={search.keyword} hasActiveAdvanced={hasActiveAdvanced}
        filter={filter} onEditOrder={onEditOrder} onDelete={handleDelete} />
      {ConfirmComponent}
    </div>
  )
}
