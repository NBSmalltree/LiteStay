import { useState, useEffect, useMemo } from 'react'
import { Card, Button, Input, Select, RoomTypeManager } from './components'
import RoomMatrix from './features/room-matrix/RoomMatrix'
import CheckInDialog from './features/room-matrix/CheckInDialog'
import OrderDetailDialog from './features/room-matrix/OrderDetailDialog'
import OrdersPage from './features/orders/OrdersPage'
import FinancePage from './features/finance/FinancePage'
import RoomStatusOverview from './features/room-matrix/RoomStatusOverview'
import type { Room, RoomType, Order } from '../shared/types'

type Page = 'dashboard' | 'rooms' | 'orders' | 'overview' | 'finance'

const navItems: { id: Page; label: string; icon: JSX.Element }[] = [
  {
    id: 'dashboard',
    label: '房态总览',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
      </svg>
    ),
  },
  {
    id: 'rooms',
    label: '房间管理',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
      </svg>
    ),
  },
  {
    id: 'orders',
    label: '订单管理',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
  },
  {
    id: 'overview',
    label: '房态总览',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
      </svg>
    ),
  },
  {
    id: 'finance',
    label: '财务收银',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
]

function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.electron.win.onMaximized(setIsMaximized)
  }, [])

  return (
    <div className="titlebar-no-drag flex items-center">
      <button onClick={() => window.electron.win.minimize()} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="最小化">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
      </button>
      <button onClick={() => window.electron.win.maximize()} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title={isMaximized ? '还原' : '最大化'}>
        {isMaximized
          ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 4h11a1 1 0 011 1v11M4 8h11a1 1 0 011 1v11H5a1 1 0 01-1-1V8z" /></svg>
          : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 3.75h15v15h-15z" /></svg>
        }
      </button>
      <button onClick={() => window.electron.win.close()} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="关闭">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [dbStatus, setDbStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [showTypeManager, setShowTypeManager] = useState(false)

  // Check-in dialog state
  const [checkInRoom, setCheckInRoom] = useState<Room | null>(null)
  const [checkInDate, setCheckInDate] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  // Order detail dialog state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedOrderRoom, setSelectedOrderRoom] = useState<Room | null>(null)

  // Orders data for reminders
  const [orders, setOrders] = useState<Order[]>([])
  const [orderFilter, setOrderFilter] = useState('ALL')

  // Room form state
  const [roomNumber, setRoomNumber] = useState('101')
  const [roomType, setRoomType] = useState('')
  const [roomPrice, setRoomPrice] = useState('200')
  const [formError, setFormError] = useState('')

  const loadRooms = async () => {
    try {
      setRooms(await window.electron.db.getRooms())
      setDbStatus('ok')
    } catch {
      setDbStatus('error')
    }
  }

  const loadRoomTypes = async () => {
    const types = await window.electron.db.getRoomTypes()
    setRoomTypes(types)
    if (types.length > 0 && !roomType) setRoomType(types[0].type_name)
  }

  useEffect(() => { loadRooms(); loadRoomTypes() }, [])
  useEffect(() => {
    window.electron.win.onOrdersChanged(() => setRefreshKey(k => k + 1))
  }, [])

  // Load orders for reminder banner
  const loadOrders = async () => {
    setOrders(await window.electron.db.getOrders())
  }
  useEffect(() => { loadOrders() }, [refreshKey])

  // Reminder computations
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const tomorrowStr = useMemo(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10), [])

  const todayCheckIns = useMemo(
    () => orders.filter(o => o.status === 'PREBOOK' && o.check_in_date === todayStr).length,
    [orders, todayStr]
  )
  const tomorrowCheckOuts = useMemo(
    () => orders.filter(o => o.status === 'IN_HOUSE' && o.check_out_date === tomorrowStr).length,
    [orders, tomorrowStr]
  )
  const overdueOrders = useMemo(
    () => orders.filter(o => o.status === 'IN_HOUSE' && o.check_out_date < todayStr).length,
    [orders, todayStr]
  )

  const hasReminders = todayCheckIns > 0 || tomorrowCheckOuts > 0 || overdueOrders > 0
  const showReminders = hasReminders && (page === 'dashboard' || page === 'rooms')

  const handleReminderClick = (filter: string) => {
    setOrderFilter(filter)
    setPage('orders')
  }

  const handleInsertRoom = async () => {
    setFormError('')
    if (!roomNumber.trim()) { setFormError('请输入房间号'); return }
    if (!roomType) { setFormError('请先配置房型'); return }
    try {
      await window.electron.db.insertRoom({ room_number: roomNumber.trim(), room_type: roomType, base_price: Number(roomPrice) })
      const next = parseInt(roomNumber, 10)
      if (!isNaN(next)) setRoomNumber(String(next + 1))
      await loadRooms()
    } catch (e: any) {
      setFormError(e?.message?.includes('UNIQUE') ? `房间号「${roomNumber.trim()}」已存在` : '插入失败')
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Title Bar */}
      <div className="titlebar-drag h-11 flex-shrink-0 flex items-center justify-between bg-white border-b border-gray-200">
        <div className="flex items-center gap-2.5 pl-4">
          <div className="w-6 h-6 rounded-md bg-primary-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-900">LiteStay</span>
        </div>
        <WindowControls />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${page === item.id ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="px-3 py-3 border-t border-gray-100 space-y-2">
            <button onClick={() => setShowTypeManager(true)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.75 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              房型配置
            </button>
            <div className="flex items-center gap-2 px-3 py-1 text-xs text-gray-400">
              <span className={`inline-block w-2 h-2 rounded-full ${dbStatus === 'ok' ? 'bg-green-400' : dbStatus === 'error' ? 'bg-red-400' : 'bg-gray-300'}`} />
              {dbStatus === 'ok' ? '数据库已连接' : dbStatus === 'error' ? '连接失败' : '连接中...'}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          {/* Reminder banner */}
          {showReminders && (
            <div className="px-6 pt-4 flex flex-wrap gap-2">
              {todayCheckIns > 0 && (
                <button
                  onClick={() => handleReminderClick('PREBOOK')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <span className="text-base">📥</span>
                  <span>今日入住</span>
                  <span className="text-xs font-bold bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center">{todayCheckIns}</span>
                </button>
              )}
              {tomorrowCheckOuts > 0 && (
                <button
                  onClick={() => handleReminderClick('IN_HOUSE')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm font-medium hover:bg-yellow-100 transition-colors cursor-pointer"
                >
                  <span className="text-base">📤</span>
                  <span>明日退房</span>
                  <span className="text-xs font-bold bg-yellow-500 text-white rounded-full w-5 h-5 flex items-center justify-center">{tomorrowCheckOuts}</span>
                </button>
              )}
              {overdueOrders > 0 && (
                <button
                  onClick={() => handleReminderClick('IN_HOUSE')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <span className="text-base">⏰</span>
                  <span>超时未退</span>
                  <span className="text-xs font-bold bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center">{overdueOrders}</span>
                </button>
              )}
            </div>
          )}

          {page === 'dashboard' && (
            <div className="p-6 h-full">
              <RoomMatrix key={refreshKey}
                onCellClick={(room, date) => {
                  setCheckInRoom(room)
                  setCheckInDate(date)
                }}
                onOrderClick={(order, room) => {
                  setSelectedOrder(order)
                  setSelectedOrderRoom(room)
                }}
              />
            </div>
          )}
          {page === 'rooms' && (
            <div className="p-8">
              <RoomsPage
                rooms={rooms} roomTypes={roomTypes}
                roomNumber={roomNumber} setRoomNumber={setRoomNumber}
                roomType={roomType} setRoomType={setRoomType}
                roomPrice={roomPrice} setRoomPrice={setRoomPrice}
                onInsertRoom={handleInsertRoom} formError={formError} setFormError={setFormError}
                onOpenTypeManager={() => setShowTypeManager(true)}
              />
            </div>
          )}
          {page === 'orders' && (
            <div className="p-8">
              <OrdersPage refreshKey={refreshKey} initialFilter={orderFilter} onEditOrder={(order, room) => {
                setSelectedOrder(order)
                setSelectedOrderRoom(room)
              }} />
            </div>
          )}
          {page === 'finance' && (
            <FinancePage refreshKey={refreshKey} />
          )}
        </main>
      </div>

      <RoomTypeManager open={showTypeManager} onClose={() => setShowTypeManager(false)} onChanged={loadRoomTypes} />
      <CheckInDialog
        open={!!checkInRoom}
        room={checkInRoom}
        checkInDate={checkInDate}
        onClose={() => setCheckInRoom(null)}
        onSaved={() => { setCheckInRoom(null); setRefreshKey(k => k + 1) }}
      />
      <OrderDetailDialog
        open={!!selectedOrder}
        order={selectedOrder}
        room={selectedOrderRoom}
        onClose={() => { setSelectedOrder(null); setSelectedOrderRoom(null) }}
        onSaved={() => { setSelectedOrder(null); setSelectedOrderRoom(null); setRefreshKey(k => k + 1) }}
        onDeleted={() => { setSelectedOrder(null); setSelectedOrderRoom(null); setRefreshKey(k => k + 1) }}
      />
    </div>
  )
}

/* --- Room Management Page --- */
function RoomsPage({
  rooms, roomTypes, roomNumber, setRoomNumber, roomType, setRoomType,
  roomPrice, setRoomPrice, onInsertRoom, formError, setFormError, onOpenTypeManager,
}: {
  rooms: Room[]; roomTypes: RoomType[]
  roomNumber: string; setRoomNumber: (v: string) => void
  roomType: string; setRoomType: (v: string) => void
  roomPrice: string; setRoomPrice: (v: string) => void
  onInsertRoom: () => void; formError: string; setFormError: (v: string) => void
  onOpenTypeManager: () => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">房间管理</h1>
        <p className="mt-1 text-sm text-gray-500">添加和管理民宿房间</p>
      </div>

      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-4">添加房间</h2>
        {roomTypes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 mb-3">请先配置房型，再添加房间</p>
            <Button onClick={onOpenTypeManager}>去配置房型</Button>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-3 mb-2">
              <div className="w-32">
                <Input label="房间号" id="room-number" value={roomNumber} onChange={(e) => { setRoomNumber(e.target.value); setFormError('') }} />
              </div>
              <div className="w-40">
                <Select label="房型" id="room-type" value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                  {roomTypes.map((t) => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)}
                </Select>
              </div>
              <div className="w-32">
                <Input label="基础房价" id="base-price" type="number" value={roomPrice} onChange={(e) => setRoomPrice(e.target.value)} />
              </div>
              <Button onClick={onInsertRoom}>添加房间</Button>
            </div>
            {formError && <p className="text-sm text-red-600 mb-4">{formError}</p>}
          </>
        )}

        {rooms.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden mt-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">房间号</th>
                  <th className="text-left px-4 py-2.5 font-medium">房型</th>
                  <th className="text-right px-4 py-2.5 font-medium">基础房价</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rooms.map((r) => (
                  <tr key={r.room_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{r.room_number}</td>
                    <td className="px-4 py-2.5 text-gray-600">{r.room_type}</td>
                    <td className="px-4 py-2.5 text-right text-gray-900">¥{r.base_price.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : roomTypes.length > 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm mt-4">暂无房间数据，请添加第一条记录</div>
        ) : null}
      </Card>
    </div>
  )
}
