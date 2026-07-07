import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { RoomTypeManager, ErrorBoundary, useDialogs } from './components'
import RoomMatrix from './features/room-matrix/RoomMatrix'
import RoomsPage from './features/rooms/RoomsPage'
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
import TrialExpiredPage from './features/trial/TrialExpiredPage'
import ActivationDialog from './features/trial/ActivationDialog'
import { useEdition } from './hooks/useEdition'
import type { Room, RoomType, Order } from '../shared/types'
import type { FeatureKey } from '../shared/editions'

type Page = 'dashboard' | 'rooms' | 'orders' | 'overview' | 'finance' | 'analytics' | 'pricing' | 'backup' | 'guests' | 'invoices'

const NavIcon = ({ path }: { path: string }) => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
)

const allNavItems: { id: Page; labelKey: string; icon: JSX.Element; feature: FeatureKey }[] = [
  { id: 'dashboard', labelKey: 'nav.matrix', feature: 'page.roomMatrix',
    icon: <NavIcon path="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" /> },
  { id: 'rooms', labelKey: 'nav.rooms', feature: 'page.roomManagement',
    icon: <NavIcon path="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" /> },
  { id: 'orders', labelKey: 'nav.orders', feature: 'page.orders',
    icon: <NavIcon path="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /> },
  { id: 'overview', labelKey: 'nav.overview', feature: 'page.overview',
    icon: <NavIcon path="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" /> },
  { id: 'finance', labelKey: 'nav.finance', feature: 'page.finance',
    icon: <NavIcon path="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /> },
  { id: 'analytics', labelKey: 'nav.analytics', feature: 'page.analytics',
    icon: <NavIcon path="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /> },
  { id: 'pricing', labelKey: 'nav.pricing', feature: 'page.pricing',
    icon: <NavIcon path="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  { id: 'backup', labelKey: 'nav.backup', feature: 'page.backup',
    icon: <NavIcon path="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /> },
  { id: 'guests', labelKey: 'nav.guests', feature: 'page.guests',
    icon: <NavIcon path="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /> },
  { id: 'invoices', labelKey: 'nav.invoices', feature: 'page.invoices',
    icon: <NavIcon path="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /> },
]

function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false)
  useEffect(() => { window.electron.win.onMaximized(setIsMaximized) }, [])
  return (
    <div className="titlebar-no-drag flex items-center">
      {[
        { label: 'minimize', onClick: () => window.electron.win.minimize(), icon: 'M5 12h14' },
        { label: 'maximize', onClick: () => window.electron.win.maximize(),
          icon: isMaximized ? 'M8 4h11a1 1 0 011 1v11M4 8h11a1 1 0 011 1v11H5a1 1 0 01-1-1V8z' : 'M4.5 3.75h15v15h-15z' },
        { label: 'close', onClick: () => window.electron.win.close(), icon: 'M6 18L18 6M6 6l12 12' },
      ].map(({ onClick, icon }) => (
        <button key={icon} onClick={onClick} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const { t, i18n } = useTranslation()
  const { info: editionInfo, loading: editionLoading, hasFeature } = useEdition()
  const [page, setPage] = useState<Page>('dashboard')
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [dbStatus, setDbStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [showTypeManager, setShowTypeManager] = useState(false)
  const [showActivation, setShowActivation] = useState(false)
  const navItems = useMemo(() => allNavItems.filter(item => hasFeature(item.feature)), [hasFeature])
  const isTrialExpired = editionInfo.edition === 'trial' && editionInfo.trialExpired
  const [checkInRoom, setCheckInRoom] = useState<Room | null>(null)
  const [checkInDate, setCheckInDate] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedOrderRoom, setSelectedOrderRoom] = useState<Room | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [orderFilter, setOrderFilter] = useState('ALL')
  const [orderDateFilter, setOrderDateFilter] = useState<string | undefined>(undefined)
  const [roomNumber, setRoomNumber] = useState('101')
  const [roomType, setRoomType] = useState('')
  const [roomPrice, setRoomPrice] = useState('200')
  const [formError, setFormError] = useState('')
  const { showAlert: appShowAlert, AlertComponent: appAlertComp } = useDialogs()

  const loadRooms = async () => {
    try { setRooms(await window.electron.db.getRooms()); setDbStatus('ok') }
    catch { setDbStatus('error') }
  }

  const loadRoomTypes = async () => {
    const types = await window.electron.db.getRoomTypes()
    setRoomTypes(types)
    if (types.length > 0 && !roomType) setRoomType(types[0].type_name)
  }

  useEffect(() => { loadRooms(); loadRoomTypes() }, [])
  useEffect(() => { window.electron.win.onOrdersChanged(() => setRefreshKey(k => k + 1)) }, [])

  const loadOrders = async () => { setOrders(await window.electron.db.getOrders()) }
  useEffect(() => { loadOrders() }, [refreshKey])

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const tomorrowStr = useMemo(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10), [])
  const todayCheckIns = useMemo(() => orders.filter(o => o.status === 'PREBOOK' && o.check_in_date === todayStr).length, [orders, todayStr])
  const tomorrowCheckOuts = useMemo(() => orders.filter(o => o.status === 'IN_HOUSE' && o.check_out_date === tomorrowStr).length, [orders, tomorrowStr])
  const overdueOrders = useMemo(() => orders.filter(o => o.status === 'IN_HOUSE' && o.check_out_date < todayStr).length, [orders, todayStr])
  const showReminders = page === 'dashboard' || page === 'rooms'

  const handleReminderClick = (filter: string, checkInDate?: string) => { setOrderFilter(filter); setOrderDateFilter(checkInDate); setPage('orders') }
  const toggleLanguage = () => i18n.changeLanguage(i18n.language.startsWith('zh') ? 'en' : 'zh')

  const handleInsertRoom = async () => {
    setFormError('')
    if (!roomNumber.trim()) { setFormError(t('roomsPage.enterRoomNumber')); return }
    if (!roomType) { setFormError(t('roomsPage.configureTypeFirst2')); return }
    try {
      await window.electron.db.insertRoom({ room_number: roomNumber.trim(), room_type: roomType, base_price: Number(roomPrice) })
      const next = parseInt(roomNumber, 10)
      if (!isNaN(next)) setRoomNumber(String(next + 1))
      await loadRooms()
    } catch (e) { setFormError((e as Error)?.message?.includes('UNIQUE') ? t('roomsPage.roomExists', { roomNumber: roomNumber.trim() }) : t('roomsPage.insertFailed')) }
  }

  if (editionLoading) return <div className="h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" /><p className="text-gray-600">{t('common.loading')}</p></div></div>
  if (isTrialExpired) return <TrialExpiredPage />

  const reminders = [
    { label: 'todayCheckIns', count: todayCheckIns, filter: 'PREBOOK', date: todayStr, activeBg: 'bg-blue-50 border-blue-200 text-blue-700', activeCount: 'bg-blue-600', inactiveBg: 'bg-gray-50 border-gray-200 text-gray-500' },
    { label: 'tomorrowCheckOuts', count: tomorrowCheckOuts, filter: 'IN_HOUSE', activeBg: 'bg-yellow-50 border-yellow-200 text-yellow-700', activeCount: 'bg-yellow-500', inactiveBg: 'bg-gray-50 border-gray-200 text-gray-500' },
    { label: 'overdueOrders', count: overdueOrders, filter: 'IN_HOUSE', activeBg: 'bg-red-50 border-red-200 text-red-700', activeCount: 'bg-red-600', inactiveBg: 'bg-gray-50 border-gray-200 text-gray-500' },
  ]

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <div className="p-6 h-full"><RoomMatrix key={refreshKey} onCellClick={(room, date) => { setCheckInRoom(room); setCheckInDate(date) }} onOrderClick={(order, room) => { setSelectedOrder(order); setSelectedOrderRoom(room) }} /></div>
      case 'rooms': return <div className="p-8"><RoomsPage rooms={rooms} roomTypes={roomTypes} roomNumber={roomNumber} setRoomNumber={setRoomNumber} roomType={roomType} setRoomType={setRoomType} roomPrice={roomPrice} setRoomPrice={setRoomPrice} onInsertRoom={handleInsertRoom} formError={formError} setFormError={setFormError} onOpenTypeManager={() => setShowTypeManager(true)} onDeleteRoom={async (id) => { try { await window.electron.db.deleteRoom(id); await loadRooms() } catch (e) { appShowAlert({ message: (e as Error)?.message || t('roomsPage.deleteFailed'), variant: 'error' }) }}} onUpdateRoom={async (id, updates) => { try { await window.electron.db.updateRoom(id, updates); await loadRooms() } catch (e) { appShowAlert({ message: (e as Error)?.message || t('roomsPage.updateFailed'), variant: 'error' }) }}} /></div>
      case 'orders': return <div className="p-8"><OrdersPage refreshKey={refreshKey} initialFilter={orderFilter} initialCheckInDate={orderDateFilter} onEditOrder={(order, room) => { setSelectedOrder(order); setSelectedOrderRoom(room) }} /></div>
      case 'overview': return <RoomStatusOverview key={refreshKey} refreshKey={refreshKey} onCheckIn={(room) => { setCheckInRoom(room); setCheckInDate(todayStr) }} onViewOrder={(order, room) => { setSelectedOrder(order); setSelectedOrderRoom(room) }} />
      case 'finance': return <FinancePage refreshKey={refreshKey} />
      case 'analytics': return <AnalyticsPage refreshKey={refreshKey} />
      case 'pricing': return <PricingPage refreshKey={refreshKey} />
      case 'backup': return <BackupPage refreshKey={refreshKey} />
      case 'guests': return <div className="p-8"><GuestsPage refreshKey={refreshKey} /></div>
      case 'invoices': return <InvoicesPage refreshKey={refreshKey} />
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
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
          <button onClick={toggleLanguage} className="titlebar-no-drag px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors" title={i18n.language.startsWith('zh') ? 'Switch to English' : '切换到中文'}>{i18n.language.startsWith('zh') ? 'EN' : '中'}</button>
          <WindowControls />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => setPage(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${page === item.id ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                {item.icon}{t(item.labelKey)}
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
            <div className="flex items-center gap-2 px-3 py-1 text-xs text-gray-400 cursor-pointer hover:text-gray-600 hover:bg-gray-50 rounded transition-colors" onClick={() => setShowActivation(true)} title={t('activation.clickToActivate')}>
              <span className={`inline-block w-2 h-2 rounded-full ${editionInfo.edition === 'ultimate' ? 'bg-yellow-400' : editionInfo.edition === 'pro' ? 'bg-blue-400' : editionInfo.edition === 'basic' ? 'bg-green-400' : 'bg-gray-400'}`} />
              {t(`editions.${editionInfo.edition}`)}
              {editionInfo.edition === 'trial' && editionInfo.trialDaysRemaining !== null && <span className="text-gray-500">({t('trial.daysRemaining', { days: editionInfo.trialDaysRemaining })})</span>}
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-auto bg-gray-50">
          {showReminders && (
            <div className="px-6 pt-4 flex flex-wrap gap-2">
              {reminders.map(({ label, count, filter, date, activeBg, activeCount, inactiveBg }) => (
                <button key={label} onClick={() => handleReminderClick(filter, date)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${count > 0 ? activeBg : inactiveBg}`}>
                  <span className="text-base">{label === 'todayCheckIns' ? '📥' : label === 'tomorrowCheckOuts' ? '📤' : '⏰'}</span>
                  <span>{t(`reminders.${label}`)}</span>
                  <span className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${count > 0 ? `${activeCount} text-white` : 'bg-gray-400 text-white'}`}>{count}</span>
                </button>
              ))}
            </div>
          )}
          <ErrorBoundary>{renderPage()}</ErrorBoundary>
        </main>
      </div>

      <RoomTypeManager open={showTypeManager} onClose={() => setShowTypeManager(false)} onChanged={loadRoomTypes} />
      <CheckInDialog open={!!checkInRoom} room={checkInRoom} checkInDate={checkInDate} onClose={() => setCheckInRoom(null)} onSaved={() => { setCheckInRoom(null); setRefreshKey(k => k + 1) }} />
      <OrderDetailDialog open={!!selectedOrder} order={selectedOrder} room={selectedOrderRoom} onClose={() => { setSelectedOrder(null); setSelectedOrderRoom(null) }} onSaved={() => { setSelectedOrder(null); setSelectedOrderRoom(null); setRefreshKey(k => k + 1) }} onDeleted={() => { setSelectedOrder(null); setSelectedOrderRoom(null); setRefreshKey(k => k + 1) }} />
      <ActivationDialog open={showActivation} onClose={() => setShowActivation(false)} />
      {appAlertComp}
    </div>
  )
}
