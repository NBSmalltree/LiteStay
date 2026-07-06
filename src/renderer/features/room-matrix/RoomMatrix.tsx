import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { fmtDate } from '../../utils'
import type { Room, Order } from '../../../shared/types'

const DAYS_SHOWN = 14
const ROOM_COL_W = 120
const ROW_H = 56

const STATUS_STYLES: Record<string, { bg: string; text: string; labelKey: string }> = {
  IN_HOUSE: { bg: 'bg-red-500', text: 'text-white', labelKey: 'roomMatrix.inHouse' },
  PREBOOK: { bg: 'bg-blue-500', text: 'text-white', labelKey: 'roomMatrix.prebook' },
  CHECKED_OUT: { bg: 'bg-gray-400', text: 'text-white', labelKey: 'roomMatrix.checkedOut' },
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

const WEEKDAY_KEYS = ['weekdays.sun', 'weekdays.mon', 'weekdays.tue', 'weekdays.wed', 'weekdays.thu', 'weekdays.fri', 'weekdays.sat']

export default function RoomMatrix({ onCellClick, onOrderClick }: {
  onCellClick?: (room: Room, date: string) => void
  onOrderClick?: (order: Order, room: Room) => void
}) {
  const { t, i18n } = useTranslation()
  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  }, [])

  const [viewStart, setViewStart] = useState(() => new Date(today))

  const [rooms, setRooms] = useState<Room[]>([])
  const [orders, setOrders] = useState<Order[]>([])

  const dates = useMemo(() => Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(viewStart, i)), [viewStart])
  const rangeStart = useMemo(() => fmtDate(dates[0]), [dates])
  const rangeEnd = useMemo(() => fmtDate(dates[dates.length - 1]), [dates])

  const fetchOrders = () => window.electron.db.getOrders().then(setOrders)
  useEffect(() => {
    Promise.all([
      window.electron.db.getRooms().then(setRooms),
      fetchOrders(),
    ])
  }, [])
  useEffect(() => {
    window.electron.win.onOrdersChanged(() => fetchOrders())
  }, [])

  const todayStr = useMemo(() => fmtDate(today), [today])

  const visibleOrders = useMemo(
    () => orders.filter(o => o.check_out_date > rangeStart && o.check_in_date <= rangeEnd),
    [orders, rangeStart, rangeEnd]
  )

  const goToday = () => setViewStart(new Date(today))
  const goPrev = () => setViewStart(p => addDays(p, -DAYS_SHOWN))
  const goNext = () => setViewStart(p => addDays(p, DAYS_SHOWN))
  const goPrevDay = () => setViewStart(p => addDays(p, -1))
  const goNextDay = () => setViewStart(p => addDays(p, 1))

  function getOrderStyle(order: Order): { left: string; width: string } | null {
    const startIdx = dates.findIndex(d => fmtDate(d) >= order.check_in_date)
    const endIdx = dates.findIndex(d => fmtDate(d) >= order.check_out_date)
    const s = startIdx < 0 ? 0 : startIdx
    const e = endIdx < 0 ? dates.length : endIdx
    if (e <= s) return null
    const leftPct = (s / DAYS_SHOWN) * 100
    const widthPct = ((e - s) / DAYS_SHOWN) * 100
    return { left: `${leftPct}%`, width: `${widthPct}%` }
  }

  // Build month label with language awareness
  const monthLabel = i18n.language.startsWith('zh')
    ? `${viewStart.getFullYear()}年${viewStart.getMonth() + 1}月`
    : `${viewStart.toLocaleString('en', { month: 'short' })} ${viewStart.getFullYear()}`

  return (
    <div className="h-full flex flex-col">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <button onClick={goPrev} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors" title={t('roomMatrix.prev14Days')}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 9l-3 3m0 0l3 3m-3-3h7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button onClick={goPrevDay} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" title={t('roomMatrix.prevDay')}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900 min-w-[120px] text-center">{monthLabel}</h2>
          <button onClick={goNextDay} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" title={t('roomMatrix.nextDay')}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
          <button onClick={goNext} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors" title={t('roomMatrix.next14Days')}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 15l3-3m0 0l-3-3m3 3h-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        <button onClick={goToday} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
          {t('roomMatrix.today')}
        </button>
      </div>

      {/* Grid */}
      {rooms.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          {t('roomMatrix.noRooms')}
        </div>
      ) : (
        <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden bg-white flex flex-col">
          {/* Date header */}
          <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="border-r border-gray-200 bg-gray-50 flex items-center px-3 text-xs font-medium text-gray-500 flex-shrink-0" style={{ width: ROOM_COL_W }}>
              {t('roomMatrix.room')}
            </div>
            {dates.map((d, i) => {
              const isToday = fmtDate(d) === fmtDate(today)
              const isWE = d.getDay() === 0 || d.getDay() === 6
              return (
                <div key={i} className={`flex-1 text-center border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-primary-50' : ''}`}>
                  <div className={`text-xs leading-4 pt-1 ${isToday ? 'text-primary-700 font-bold' : isWE ? 'text-red-400' : 'text-gray-500'}`}>
                    {t(WEEKDAY_KEYS[d.getDay()])}
                  </div>
                  <div className={`text-sm font-semibold leading-5 pb-1 ${isToday ? 'text-primary-700' : 'text-gray-900'}`}>
                    {d.getMonth() + 1}/{d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Room rows */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {rooms.map((room) => {
              const roomOrders = visibleOrders.filter(o => o.room_id === room.room_id)
              return (
                <div key={room.room_id} className="flex border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50">
                  <div className="border-r border-gray-200 bg-white flex flex-col justify-center px-3 flex-shrink-0" style={{ width: ROOM_COL_W, minHeight: ROW_H }}>
                    <span className="text-sm font-semibold text-gray-900">{room.room_number}</span>
                    <span className="text-xs text-gray-400">{room.room_type}</span>
                  </div>
                  <div className="flex-1 relative" style={{ minHeight: ROW_H }}>
                    {/* Cell backgrounds */}
                    <div className="flex absolute inset-0">
                      {dates.map((d, i) => {
                        const isToday = fmtDate(d) === fmtDate(today)
                        return (
                          <div
                            key={i}
                            className={`flex-1 border-r border-gray-100 last:border-r-0 cursor-pointer
                              hover:bg-primary-50/50 transition-colors ${isToday ? 'bg-primary-50/30' : ''}`}
                            onClick={() => onCellClick?.(room, fmtDate(d))}
                          />
                        )
                      })}
                    </div>
                    {/* Order blocks */}
                    {roomOrders.map((order) => {
                      const style = STATUS_STYLES[order.status] || STATUS_STYLES.CHECKED_OUT
                      const pos = getOrderStyle(order)
                      if (!pos) return null
                      return (
                        <div
                          key={order.order_id}
                          className={`absolute top-1 bottom-1 rounded-md ${style.bg} ${style.text}
                            flex items-center px-2 text-xs font-medium shadow-sm cursor-pointer
                            hover:brightness-110 transition-all overflow-hidden`}
                          style={{ left: pos.left, width: pos.width, zIndex: 10 }}
                          onClick={(e) => { e.stopPropagation(); onOrderClick?.(order, room) }}
                          title={`${order.guest_name}${order.guest_phone ? '\n' + order.guest_phone : ''} (${t(style.labelKey)})\n${order.check_in_date} ~ ${order.check_out_date}${order.notes ? '\n' + order.notes : ''}`}
                        >
                          <span className="truncate">{order.guest_name}</span>
                          {order.notes && (
                            <svg className="w-3 h-3 flex-shrink-0 ml-1 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                            </svg>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
