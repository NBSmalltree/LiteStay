import { useState, useEffect, useCallback } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, Input, Select } from '../../components'
import type { FinancialSummary, FinancialLogDetailed, Order, Room } from '../../../shared/types'

const today = () => new Date().toISOString().slice(0, 10)
const firstOfMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

type Range = 'today' | 'month' | 'custom'
const TYPE_LABEL: Record<string, string> = { ROOM_FEE: '房费', DEPOSIT: '押金', INCIDENTAL: '杂费' }
const METHOD_COLORS: Record<string, string> = { WeChat: '#07C160', Alipay: '#1677FF', Cash: '#F59E0B' }
const METHOD_LABEL: Record<string, string> = { WeChat: '微信', Alipay: '支付宝', Cash: '现金' }
const PAYMENT_METHODS = [
  { value: 'WeChat', label: '微信' },
  { value: 'Alipay', label: '支付宝' },
  { value: 'Cash', label: '现金' },
]

export default function FinancePage({ refreshKey }: { refreshKey: number }) {
  const [range, setRange] = useState<Range>('today')
  const [dateFrom, setDateFrom] = useState(today())
  const [dateTo, setDateTo] = useState(today())
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [logs, setLogs] = useState<FinancialLogDetailed[]>([])
  const [exporting, setExporting] = useState(false)
  const [showIncidental, setShowIncidental] = useState(false)
  const [incAmount, setIncAmount] = useState('100')
  const [incMethod, setIncMethod] = useState('WeChat')
  const [incOrderId, setIncOrderId] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [rooms, setRooms] = useState<Room[]>([])

  const resolvedFrom = range === 'today' ? today() : range === 'month' ? firstOfMonth() : dateFrom
  const resolvedTo = range === 'today' ? today() : range === 'month' ? today() : dateTo

  const load = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([
        window.electron.db.getFinancialSummary(resolvedFrom, resolvedTo),
        window.electron.db.getFinancialLogsDetailed(resolvedFrom, resolvedTo),
      ])
      setSummary(s)
      setLogs(l)
    } catch (e) {
      console.error('[FinancePage] load error:', e)
    }
  }, [resolvedFrom, resolvedTo])

  useEffect(() => { load() }, [load, refreshKey])
  useEffect(() => {
    Promise.resolve(window.electron.db.getOrders()).then(setOrders).catch((e: any) => console.error('[FinancePage] orders error:', e))
    Promise.resolve(window.electron.db.getRooms()).then(setRooms).catch((e: any) => console.error('[FinancePage] rooms error:', e))
  }, [refreshKey])

  const handleRange = (r: Range) => {
    setRange(r)
    if (r === 'today') { setDateFrom(today()); setDateTo(today()) }
    else if (r === 'month') { setDateFrom(firstOfMonth()); setDateTo(today()) }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const path = await window.electron.db.exportFinancialLogs(resolvedFrom, resolvedTo)
      if (path) alert(`已导出到：${path}`)
    } finally {
      setExporting(false)
    }
  }

  const totalIncome = summary ? summary.roomFee + summary.incidental : 0

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">财务收银</h1>
          <p className="mt-1 text-sm text-gray-500">收入统计与流水明细</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || logs.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {exporting ? '导出中...' : '导出 Excel'}
        </button>
      </div>

      {/* Date range tabs */}
      <div className="flex items-center gap-3">
        {([['today', '今天'], ['month', '本月'], ['custom', '自定义']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => handleRange(key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${range === key ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'}`}
          >
            {label}
          </button>
        ))}
        {range === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
            <span className="text-gray-400 text-sm">至</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
          </div>
        )}
      </div>

      {/* Incidental charge form */}
      {!showIncidental ? (
        <button onClick={() => setShowIncidental(true)}
          className="text-sm text-primary-600 hover:text-primary-700 hover:underline">
          + 录入杂费
        </button>
      ) : (
        <div className="flex items-end gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="w-32">
            <Input label="杂费金额" id="inc-amount" type="number" value={incAmount}
              onChange={e => setIncAmount(e.target.value)} />
          </div>
          <div className="w-28">
            <Select label="支付方式" id="inc-method" value={incMethod}
              onChange={e => setIncMethod(e.target.value)}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
          </div>
          <div className="w-40">
            <Select label="关联订单（可选）" id="inc-order" value={incOrderId}
              onChange={e => setIncOrderId(e.target.value)}>
              <option value="">不关联</option>
              {orders.map(o => {
                const r = rooms.find(rm => rm.room_id === o.room_id)
                return <option key={o.order_id} value={o.order_id}>{r?.room_number ?? '?'} - {o.guest_name}</option>
              })}
            </Select>
          </div>
          <button
            onClick={async () => {
              await window.electron.db.insertFinancialLog({
                order_id: incOrderId ? Number(incOrderId) : null,
                type: 'INCIDENTAL',
                amount: Number(incAmount),
                payment_method: incMethod as any,
              })
              setShowIncidental(false)
              setIncAmount('100')
              setIncOrderId('')
              load()
            }}
            className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            确认录入
          </button>
          <button onClick={() => setShowIncidental(false)}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            取消
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">房费收入</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">¥{(summary?.roomFee ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 0 })}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">押金收入</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">¥{(summary?.deposit ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 0 })}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">杂费收入</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">¥{(summary?.incidental ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 0 })}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Chart + Logs */}
      <div className="grid grid-cols-5 gap-5">
        {/* Pie chart — payment method breakdown */}
        <Card className="col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">支付方式占比</h2>
          {summary && summary.byMethod.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.byMethod}
                    dataKey="total"
                    nameKey="payment_method"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    label={({ name, percent }: any) =>
                      `${METHOD_LABEL[name] || name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {summary.byMethod.map((entry) => (
                      <Cell key={entry.payment_method} fill={METHOD_COLORS[entry.payment_method] || '#9CA3AF'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => `¥${Number(value).toLocaleString('zh-CN')}`}
                    labelFormatter={(label: any) => METHOD_LABEL[label] || label}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-sm text-gray-400">暂无数据</div>
          )}
          {/* Legend */}
          {summary && summary.byMethod.length > 0 && (
            <div className="flex justify-center gap-5 mt-2">
              {summary.byMethod.map(m => (
                <div key={m.payment_method} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: METHOD_COLORS[m.payment_method] || '#9CA3AF' }} />
                  {METHOD_LABEL[m.payment_method] || m.payment_method}
                  <span className="text-gray-400">¥{m.total.toLocaleString('zh-CN')}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Financial logs table */}
        <Card className="col-span-3">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">流水明细</h2>
          {logs.length > 0 ? (
            <div className="overflow-auto max-h-80 rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">时间</th>
                    <th className="text-left px-3 py-2 font-medium">类型</th>
                    <th className="text-left px-3 py-2 font-medium">房号</th>
                    <th className="text-left px-3 py-2 font-medium">客人</th>
                    <th className="text-left px-3 py-2 font-medium">支付方式</th>
                    <th className="text-right px-3 py-2 font-medium">金额</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => (
                    <tr key={log.log_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatTime(log.created_at)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeBadgeClass(log.type)}`}>
                          {TYPE_LABEL[log.type] || log.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-900">{log.room_number || '-'}</td>
                      <td className="px-3 py-2 text-gray-600">{log.guest_name || '-'}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <span className="w-2 h-2 rounded-full" style={{ background: METHOD_COLORS[log.payment_method] || '#9CA3AF' }} />
                          {METHOD_LABEL[log.payment_method] || log.payment_method}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">¥{log.amount.toLocaleString('zh-CN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-gray-400">该时间段暂无流水记录</div>
          )}
        </Card>
      </div>
    </div>
  )
}

function formatTime(iso: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function typeBadgeClass(type: string) {
  switch (type) {
    case 'ROOM_FEE': return 'bg-green-50 text-green-700'
    case 'DEPOSIT':  return 'bg-blue-50 text-blue-700'
    case 'INCIDENTAL': return 'bg-amber-50 text-amber-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}
