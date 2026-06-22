import { useState, useEffect, useMemo } from 'react'
import { Card, Select } from '../../components'
import type { Room, Order, RoomType } from '../../../shared/types'

const todayStr = new Date().toISOString().slice(0, 10)

type RoomStatus = 'vacant' | 'in_house' | 'prebook' | 'checking_in' | 'cleaning'

interface RoomStatusInfo {
  status: RoomStatus
  color: 'green' | 'red' | 'blue' | 'orange'
  label: string
  guest?: string
}

const STATUS_CONFIG: Record<RoomStatus, { bg: string; border: string; text: string; badge: string; badgeText: string }> = {
  vacant: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100', badgeText: 'text-green-800' },
  in_house: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100', badgeText: 'text-red-800' },
  prebook: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100', badgeText: 'text-blue-800' },
  checking_in: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100', badgeText: 'text-blue-800' },
  cleaning: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100', badgeText: 'text-orange-800' },
}

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'vacant', label: '空房' },
  { value: 'in_house', label: '在住' },
  { value: 'prebook', label: '预订' },
  { value: 'cleaning', label: '待清洁' },
]

const getRoomStatus = (room: Room, orders: Order[]): RoomStatusInfo => {
  const activeOrder = orders.find(o =>
    o.room_id === room.room_id &&
    o.status !== 'CHECKED_OUT' &&
    o.check_in_date <= todayStr &&
    o.check_out_date > todayStr
  )

  if (!activeOrder) {
    const todayCheckout = orders.find(o =>
      o.room_id === room.room_id &&
      o.status === 'CHECKED_OUT' &&
      o.check_out_date === todayStr
    )
    if (todayCheckout) return { status: 'cleaning', color: 'orange', label: '待清洁' }
    return { status: 'vacant', color: 'green', label: '空房' }
  }

  if (activeOrder.status === 'IN_HOUSE') return { status: 'in_house', color: 'red', label: '在住', guest: activeOrder.guest_name }
  if (activeOrder.status === 'PREBOOK') {
    if (activeOrder.check_in_date === todayStr) return { status: 'checking_in', color: 'blue', label: '预订', guest: activeOrder.guest_name }
    return { status: 'prebook', color: 'blue', label: '预订', guest: activeOrder.guest_name }
  }

  return { status: 'vacant', color: 'green', label: '空房' }
}

interface Props {
  onCheckIn: (room: Room) => void
  onViewOrder: (order: Order, room: Room) => void
  refreshKey?: number
}

export default function RoomStatusOverview({ onCheckIn, onViewOrder, refreshKey }: Props) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    Promise.resolve(window.electron.db.getRooms()).then(setRooms)
    Promise.resolve(window.electron.db.getOrders()).then(setOrders)
    Promise.resolve(window.electron.db.getRoomTypes()).then(setRoomTypes)
  }, [refreshKey])

  const roomsWithStatus = useMemo(() => {
    return rooms.map(room => ({
      room,
      statusInfo: getRoomStatus(room, orders),
    }))
  }, [rooms, orders])

  const stats = useMemo(() => {
    const counts = { total: rooms.length, vacant: 0, in_house: 0, prebook: 0, cleaning: 0 }
    roomsWithStatus.forEach(({ statusInfo }) => {
      if (statusInfo.status === 'vacant') counts.vacant++
      else if (statusInfo.status === 'in_house') counts.in_house++
      else if (statusInfo.status === 'prebook' || statusInfo.status === 'checking_in') counts.prebook++
      else if (statusInfo.status === 'cleaning') counts.cleaning++
    })
    return counts
  }, [roomsWithStatus, rooms.length])

  const filteredRooms = useMemo(() => {
    return roomsWithStatus.filter(({ room, statusInfo }) => {
      if (statusFilter !== 'all' && statusInfo.status !== statusFilter) return false
      if (typeFilter !== 'all' && room.room_type !== typeFilter) return false
      return true
    })
  }, [roomsWithStatus, statusFilter, typeFilter])

  const handleRoomClick = (room: Room, statusInfo: RoomStatusInfo) => {
    if (statusInfo.status === 'vacant') {
      onCheckIn(room)
    } else {
      const order = orders.find(o =>
        o.room_id === room.room_id &&
        o.status !== 'CHECKED_OUT' &&
        o.check_in_date <= todayStr &&
        o.check_out_date > todayStr
      )
      if (order) onViewOrder(order, room)
    }
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">房态总览</h1>
        <p className="mt-1 text-sm text-gray-500">实时查看所有房间状态</p>
      </div>

      {/* Statistics Bar */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <Card padding="sm" className="flex flex-col items-center justify-center">
          <span className="text-xs text-gray-500 mb-1">总房间</span>
          <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
        </Card>
        <Card padding="sm" className="flex flex-col items-center justify-center">
          <span className="text-xs text-gray-500 mb-1">空房</span>
          <span className="text-2xl font-bold text-green-600">{stats.vacant}</span>
        </Card>
        <Card padding="sm" className="flex flex-col items-center justify-center">
          <span className="text-xs text-gray-500 mb-1">在住</span>
          <span className="text-2xl font-bold text-red-600">{stats.in_house}</span>
        </Card>
        <Card padding="sm" className="flex flex-col items-center justify-center">
          <span className="text-xs text-gray-500 mb-1">预订</span>
          <span className="text-2xl font-bold text-blue-600">{stats.prebook}</span>
        </Card>
        <Card padding="sm" className="flex flex-col items-center justify-center">
          <span className="text-xs text-gray-500 mb-1">待清洁</span>
          <span className="text-2xl font-bold text-orange-500">{stats.cleaning}</span>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="w-40">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_FILTER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">所有房型</option>
            {roomTypes.map(t => (
              <option key={t.type_id} value={t.type_name}>{t.type_name}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Room Grid */}
      {filteredRooms.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          暂无房间数据
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredRooms.map(({ room, statusInfo }) => {
              const config = STATUS_CONFIG[statusInfo.status]
              return (
                <Card
                  key={room.room_id}
                  padding="sm"
                  className={`cursor-pointer hover:shadow-md transition-shadow ${config.bg} ${config.border} border-2`}
                  onClick={() => handleRoomClick(room, statusInfo)}
                >
                  <div className="flex flex-col items-center text-center py-2">
                    <div className="text-lg font-bold text-gray-900 mb-1">{room.room_number}</div>
                    <div className="text-xs text-gray-500 mb-2">{room.room_type}</div>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.badge} ${config.badgeText}`}>
                      {statusInfo.label}
                    </div>
                    {statusInfo.guest && (
                      <div className="mt-2 text-sm text-gray-700 font-medium">{statusInfo.guest}</div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
