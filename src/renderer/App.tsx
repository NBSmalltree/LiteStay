import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Button, Input, Select, RoomTypeManager } from './components'
import RoomMatrix from './features/room-matrix/RoomMatrix'
import CheckInDialog from './features/room-matrix/CheckInDialog'
import OrderDetailDialog from './features/room-matrix/OrderDetailDialog'
import OrdersPage from './features/orders/OrdersPage'
import FinancePage from './features/finance/FinancePage'
import AnalyticsPage from './features/analytics/AnalyticsPage'
import BackupPage from './features/backup/BackupPage'
import PricingPage from './features/pricing/PricingPage'
import GuestsPage from './features/guests/GuestsPage'
import InvoicesPage from './features/invoices/InvoicesPage'
import RoomStatusOverview from './features/room-matrix/RoomStatusOverview'
import type { Room, RoomType, Order } from '../shared/types'

type Page = 'dashboard' | 'rooms' | 'orders' | 'overview' | 'finance' | 'analytics' | 'pricing' | 'backup' | 'guests' | 'invoices'

const navItems: { id: Page; labelKey: string; icon: JSX.Element }[] = [
  {
    id: 'dashboard',
    labelKey: 'nav.matrix',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
      </svg>
    ),
  },
  {
    id: 'rooms',
    labelKey: 'nav.rooms',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
      </svg>
    ),
  },
  {
    id: 'orders',
    labelKey: 'nav.orders',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
  },
  {
    id: 'overview',
    labelKey: 'nav.overview',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
      </svg>
    ),
  },
  {
    id: 'finance',
    labelKey: 'nav.finance',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    labelKey: 'nav.analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    id: 'pricing',
    labelKey: 'nav.pricing',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'backup',
    labelKey: 'nav.backup',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
  },
  {
    id: 'guests',
    labelKey: 'nav.guests',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    id: 'invoices',
    labelKey: 'nav.invoices',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
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
      <button onClick={() => window.electron.win.minimize()} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
      </button>
      <button onClick={() => window.electron.win.maximize()} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
        {isMaximized
          ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 4h11a1 1 0 011 1v11M4 8h11a1 1 0 011 1v11H5a1 1 0 01-1-1V8z" /></svg>
          : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 3.75h15v15h-15z" /></svg>
        }
      </button>
      <button onClick={() => window.electron.win.close()} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  )
}

export default function App() {
  const { t, i18n } = useTranslation()
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
  const [orderDateFilter, setOrderDateFilter] = useState<string | undefined>(undefined)

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

  const handleReminderClick = (filter: string, checkInDate?: string) => {
    setOrderFilter(filter)
    setOrderDateFilter(checkInDate)
    setPage('orders')
  }

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh'
    i18n.changeLanguage(newLang)
  }

  const handleInsertRoom = async () => {
    setFormError('')
    if (!roomNumber.trim()) { setFormError(t('roomsPage.enterRoomNumber')); return }
    if (!roomType) { setFormError(t('roomsPage.configureTypeFirst2')); return }
    try {
      await window.electron.db.insertRoom({ room_number: roomNumber.trim(), room_type: roomType, base_price: Number(roomPrice) })
      const next = parseInt(roomNumber, 10)
      if (!isNaN(next)) setRoomNumber(String(next + 1))
      await loadRooms()
    } catch (e: any) {
      setFormError(e?.message?.includes('UNIQUE') ? t('roomsPage.roomExists', { roomNumber: roomNumber.trim() }) : t('roomsPage.insertFailed'))
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
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            title={i18n.language === 'zh' ? 'Switch to English' : '切换到中文'}
          >
            {i18n.language === 'zh' ? 'EN' : '中'}
          </button>
          <WindowControls />
        </div>
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
                {t(item.labelKey)}
              </button>
            ))}
          </nav>

          <div className="px-3 py-3 border-t border-gray-100 space-y-2">
            <button onClick={() => setShowTypeManager(true)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.75 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t('nav.roomTypeConfig')}
            </button>
            <div className="flex items-center gap-2 px-3 py-1 text-xs text-gray-400">
              <span className={`inline-block w-2 h-2 rounded-full ${dbStatus === 'ok' ? 'bg-green-400' : dbStatus === 'error' ? 'bg-red-400' : 'bg-gray-300'}`} />
              {dbStatus === 'ok' ? t('nav.dbConnected') : dbStatus === 'error' ? t('nav.dbFailed') : t('nav.dbConnecting')}
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
                  onClick={() => handleReminderClick('PREBOOK', todayStr)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <span className="text-base">📥</span>
                  <span>{t('reminders.todayCheckIns')}</span>
                  <span className="text-xs font-bold bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center">{todayCheckIns}</span>
                </button>
              )}
              {tomorrowCheckOuts > 0 && (
                <button
                  onClick={() => handleReminderClick('IN_HOUSE')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm font-medium hover:bg-yellow-100 transition-colors cursor-pointer"
                >
                  <span className="text-base">📤</span>
                  <span>{t('reminders.tomorrowCheckOuts')}</span>
                  <span className="text-xs font-bold bg-yellow-500 text-white rounded-full w-5 h-5 flex items-center justify-center">{tomorrowCheckOuts}</span>
                </button>
              )}
              {overdueOrders > 0 && (
                <button
                  onClick={() => handleReminderClick('IN_HOUSE')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <span className="text-base">⏰</span>
                  <span>{t('reminders.overdueOrders')}</span>
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
                onDeleteRoom={async (roomId) => {
                  try {
                    await window.electron.db.deleteRoom(roomId)
                    await loadRooms()
                  } catch (e: any) {
                    alert(e?.message || t('roomsPage.deleteFailed'))
                  }
                }}
                onUpdateRoom={async (roomId, updates) => {
                  try {
                    await window.electron.db.updateRoom(roomId, updates)
                    await loadRooms()
                  } catch (e: any) {
                    alert(e?.message || t('roomsPage.updateFailed'))
                  }
                }}
              />
            </div>
          )}
          {page === 'orders' && (
            <div className="p-8">
              <OrdersPage refreshKey={refreshKey} initialFilter={orderFilter} initialCheckInDate={orderDateFilter} onEditOrder={(order, room) => {
                setSelectedOrder(order)
                setSelectedOrderRoom(room)
              }} />
            </div>
          )}
          {page === 'overview' && (
            <RoomStatusOverview
              key={refreshKey}
              refreshKey={refreshKey}
              onCheckIn={(room) => {
                setCheckInRoom(room)
                setCheckInDate(todayStr)
              }}
              onViewOrder={(order, room) => {
                setSelectedOrder(order)
                setSelectedOrderRoom(room)
              }}
            />
          )}
          {page === 'finance' && (
            <FinancePage refreshKey={refreshKey} />
          )}
          {page === 'analytics' && (
            <AnalyticsPage refreshKey={refreshKey} />
          )}
          {page === 'pricing' && (
            <PricingPage refreshKey={refreshKey} />
          )}
          {page === 'backup' && (
            <BackupPage refreshKey={refreshKey} />
          )}
          {page === 'guests' && (
            <div className="p-8">
              <GuestsPage refreshKey={refreshKey} />
            </div>
          )}
          {page === 'invoices' && (
            <InvoicesPage refreshKey={refreshKey} />
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
  roomPrice, setRoomPrice, onInsertRoom, formError, setFormError, onOpenTypeManager, onDeleteRoom, onUpdateRoom,
}: {
  rooms: Room[]; roomTypes: RoomType[]
  roomNumber: string; setRoomNumber: (v: string) => void
  roomType: string; setRoomType: (v: string) => void
  roomPrice: string; setRoomPrice: (v: string) => void
  onInsertRoom: () => void; formError: string; setFormError: (v: string) => void
  onOpenTypeManager: () => void
  onDeleteRoom: (roomId: number) => void
  onUpdateRoom: (roomId: number, updates: Partial<Pick<Room, 'room_type' | 'base_price'>>) => void
}) {
  const { t } = useTranslation()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editType, setEditType] = useState('')
  const [editPrice, setEditPrice] = useState('')

  const startEdit = (r: Room) => {
    setEditingId(r.room_id)
    setEditType(r.room_type)
    setEditPrice(String(r.base_price))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('roomsPage.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('roomsPage.subtitle')}</p>
      </div>

      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-4">{t('roomsPage.addRoom')}</h2>
        {roomTypes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 mb-3">{t('roomsPage.configureTypeFirst')}</p>
            <Button onClick={onOpenTypeManager}>{t('roomsPage.goConfigure')}</Button>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-3 mb-2">
              <div className="w-32">
                <Input label={t('roomsPage.roomNumber')} id="room-number" value={roomNumber} onChange={(e) => { setRoomNumber(e.target.value); setFormError('') }} />
              </div>
              <div className="w-40">
                <Select label={t('roomsPage.roomType')} id="room-type" value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                  {roomTypes.map((t) => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)}
                </Select>
              </div>
              <div className="w-32">
                <Input label={t('roomsPage.basePrice')} id="base-price" type="number" value={roomPrice} onChange={(e) => setRoomPrice(e.target.value)} />
              </div>
              <Button onClick={onInsertRoom}>{t('roomsPage.addRoomButton')}</Button>
            </div>
            {formError && <p className="text-sm text-red-600 mb-4">{formError}</p>}
          </>
        )}

        {rooms.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden mt-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">{t('roomsPage.roomNumber')}</th>
                  <th className="text-left px-4 py-2.5 font-medium">{t('roomsPage.roomType')}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{t('roomsPage.basePrice')}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{t('roomsPage.operations')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rooms.map((r) => (
                  editingId === r.room_id ? (
                    <tr key={r.room_id} className="bg-primary-50/30">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{r.room_number}</td>
                      <td className="px-4 py-2.5">
                        <Select value={editType} onChange={e => setEditType(e.target.value)}>
                          {roomTypes.map(t => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)}
                        </Select>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} />
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button onClick={() => { onUpdateRoom(r.room_id, { room_type: editType, base_price: Number(editPrice) }); setEditingId(null) }}
                          className="px-2 py-1 text-xs font-medium bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors">
                          {t('roomsPage.save')}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="ml-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors">
                          {t('roomsPage.cancel')}
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={r.room_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{r.room_number}</td>
                      <td className="px-4 py-2.5 text-gray-600">{r.room_type}</td>
                      <td className="px-4 py-2.5 text-right text-gray-900">¥{r.base_price.toFixed(0)}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button onClick={() => startEdit(r)} className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title={t('common.edit')}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        <button onClick={() => { if (confirm(t('roomsPage.deleteConfirm', { roomNumber: r.room_number }))) onDeleteRoom(r.room_id) }}
                          className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title={t('common.delete')}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        ) : roomTypes.length > 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm mt-4">{t('roomsPage.noRooms')}</div>
        ) : null}
      </Card>
    </div>
  )
}
