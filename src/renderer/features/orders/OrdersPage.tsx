import { useState, useEffect, useMemo } from 'react'
import { Button, Input } from '../../components'
import type { Order, Room } from '../../../shared/types'

const STATUS_OPTIONS = [
  { value: 'ALL', label: '全部' },
  { value: 'IN_HOUSE', label: '在住' },
  { value: 'PREBOOK', label: '预订' },
  { value: 'CHECKED_OUT', label: '已退房' },
]

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  IN_HOUSE: { bg: 'bg-red-100', text: 'text-red-700' },
  PREBOOK: { bg: 'bg-blue-100', text: 'text-blue-700' },
  CHECKED_OUT: { bg: 'bg-gray-100', text: 'text-gray-600' },
}

const STATUS_LABELS: Record<string, string> = {
  IN_HOUSE: '在住',
  PREBOOK: '预订',
  CHECKED_OUT: '已退房',
}

const PAYMENT_LABELS: Record<string, string> = {
  WeChat: '微信',
  Alipay: '支付宝',
  Cash: '现金',
}

interface Props {
  onEditOrder: (order: Order, room: Room) => void
  refreshKey?: number
  initialFilter?: string
}

export default function OrdersPage({ onEditOrder, refreshKey, initialFilter }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [incidentalMap, setIncidentalMap] = useState<Map<number, number>>(new Map())
  const [filter, setFilter] = useState(initialFilter ?? 'ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [localKey, setLocalKey] = useState(0)

  useEffect(() => {
    if (initialFilter) setFilter(initialFilter)
  }, [initialFilter])

  useEffect(() => {
    Promise.resolve(window.electron.db.getOrders()).then(setOrders)
    Promise.resolve(window.electron.db.getRooms()).then(setRooms)
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
    // Status filter
    let result = filter === 'ALL' ? orders : orders.filter(o => o.status === filter)
    // Search filter
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter(order => {
        const room = roomMap.get(order.room_id)
        return (
          order.guest_name?.toLowerCase().includes(q) ||
          room?.room_number?.toLowerCase().includes(q) ||
          order.check_in_date?.includes(q) ||
          order.check_out_date?.includes(q)
        )
      })
    }
    return result
  }, [orders, filter, searchQuery, roomMap])

  const counts = useMemo(() => ({
    ALL: orders.length,
    IN_HOUSE: orders.filter(o => o.status === 'IN_HOUSE').length,
    PREBOOK: orders.filter(o => o.status === 'PREBOOK').length,
    CHECKED_OUT: orders.filter(o => o.status === 'CHECKED_OUT').length,
  }), [orders])

  const handleDelete = async (orderId: number) => {
    if (!confirm('确定删除此订单？')) return
    await window.electron.db.deleteOrder(orderId)
    setLocalKey(k => k + 1)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">订单管理</h1>
        <p className="mt-1 text-sm text-gray-500">查看和管理所有订单</p>
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
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <Input
          type="text"
          placeholder="搜索客人、房号、日期..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {searchQuery.trim()
            ? '没有找到匹配的订单'
            : filter === 'ALL'
              ? '暂无订单'
              : `暂无${STATUS_OPTIONS.find(o => o.value === filter)?.label}订单`}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">房间</th>
                <th className="text-left px-4 py-3 font-medium">客人</th>
                <th className="text-left px-4 py-3 font-medium">入住</th>
                <th className="text-left px-4 py-3 font-medium">退房</th>
                <th className="text-left px-4 py-3 font-medium">状态</th>
                <th className="text-right px-4 py-3 font-medium">房费</th>
                <th className="text-right px-4 py-3 font-medium">押金</th>
                <th className="text-right px-4 py-3 font-medium">杂费</th>
                <th className="text-right px-4 py-3 font-medium">操作</th>
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
                    <td className="px-4 py-3 text-gray-900">{order.guest_name}</td>
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
                          title="编辑"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(order.order_id)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="删除"
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
    </div>
  )
}
