import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, Input, Select, Dialog, DatePicker } from '../../components'
import { useDialogs } from '../../components/useDialogs'
import { useEdition } from '../../hooks/useEdition'
import { fmtCurrency, METHOD_COLORS } from '../../utils'
import UpgradeBadge from '../../components/UpgradeBadge'
import NightAuditReport from './NightAuditReport'
import FinanceSummaryCards from './FinanceSummaryCards'
import FinanceLogTable from './FinanceLogTable'
import type { FinancialSummary, FinancialLogDetailed, Order, Room, NightAuditData, RevenueByRoomType, OccupancyStats } from '../../../shared/types'

const today = () => new Date().toISOString().slice(0, 10)
const firstOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` }
type Range = 'today' | 'month' | 'custom'

export default function FinancePage({ refreshKey }: { refreshKey: number }) {
  const { t, i18n } = useTranslation()
  const { hasFeature } = useEdition()
  const [range, setRange] = useState<Range>('today')
  const [dateFrom, setDateFrom] = useState(today()); const [dateTo, setDateTo] = useState(today())
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [logs, setLogs] = useState<FinancialLogDetailed[]>([])
  const [exporting, setExporting] = useState(false)
  const [showIncidental, setShowIncidental] = useState(false)
  const [incAmount, setIncAmount] = useState('100'); const [incMethod, setIncMethod] = useState<'WeChat' | 'Alipay' | 'Cash'>('WeChat'); const [incOrderId, setIncOrderId] = useState('')
  const [orders, setOrders] = useState<Order[]>([]); const [rooms, setRooms] = useState<Room[]>([])
  const [showNightAuditConfirm, setShowNightAuditConfirm] = useState(false)
  const [showNightAuditReport, setShowNightAuditReport] = useState(false)
  const [auditData, setAuditData] = useState<NightAuditData | null>(null)
  const [auditLoading, setAuditLoading] = useState(false); const [auditExporting, setAuditExporting] = useState(false)
  const resolvedFrom = range === 'today' ? today() : range === 'month' ? firstOfMonth() : dateFrom
  const resolvedTo = range === 'today' ? today() : range === 'month' ? today() : dateTo
  const { showAlert, showConfirm, AlertComponent, ConfirmComponent } = useDialogs()

  const TYPE_LABEL: Record<string, string> = useMemo(() => ({ ROOM_FEE: t('finance.roomFeeType'), DEPOSIT: t('finance.depositType'), INCIDENTAL: t('finance.incidentalType') }), [t])
  const METHOD_LABEL: Record<string, string> = useMemo(() => ({ WeChat: t('checkIn.wechat'), Alipay: t('checkIn.alipay'), Cash: t('checkIn.cash') }), [t])
  const PAYMENT_METHODS = useMemo(() => [{ value: 'WeChat', label: t('checkIn.wechat') }, { value: 'Alipay', label: t('checkIn.alipay') }, { value: 'Cash', label: t('checkIn.cash') }], [t])

  const load = useCallback(async () => {
    try { const [s, l] = await Promise.all([window.electron.db.getFinancialSummary(resolvedFrom, resolvedTo), window.electron.db.getFinancialLogsDetailed(resolvedFrom, resolvedTo)]); setSummary(s); setLogs(l) }
    catch (e) { console.error('[FinancePage] load error:', e) }
  }, [resolvedFrom, resolvedTo])

  useEffect(() => { load() }, [load, refreshKey])
  useEffect(() => {
    Promise.resolve(window.electron.db.getOrders()).then(setOrders).catch((e) => console.error('[FinancePage] orders error:', e))
    Promise.resolve(window.electron.db.getRooms()).then(setRooms).catch((e) => console.error('[FinancePage] rooms error:', e))
  }, [refreshKey])

  const handleRange = (r: Range) => { setRange(r); if (r === 'today') { setDateFrom(today()); setDateTo(today()) } else if (r === 'month') { setDateFrom(firstOfMonth()); setDateTo(today()) } }

  const executeNightAudit = async () => {
    setShowNightAuditConfirm(false); setAuditLoading(true)
    try {
      const date = today()
      const [s, byRoomType, occupancy] = await Promise.all([window.electron.db.getFinancialSummary(date, date), window.electron.db.getRevenueByRoomType(date, date), window.electron.db.getOccupancyStats(date)])
      setAuditData({ date, summary: { total: s.roomFee + s.deposit + s.incidental, roomFee: s.roomFee, deposit: s.deposit, incidental: s.incidental }, byRoomType, byMethod: s.byMethod, occupancy })
      setShowNightAuditReport(true)
    } catch (e) { showAlert({ message: t('finance.nightAuditLoadFailed'), variant: 'error' }) } finally { setAuditLoading(false) }
  }

  const handlePrintAudit = () => {
    const el = document.getElementById('night-audit-print'); if (!el || !auditData) return
    const w = window.open('', '_blank'); if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${auditData.date} Night Audit</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,PingFang SC,Microsoft YaHei,sans-serif;padding:40px;color:#111827}h1{font-size:22px;text-align:center;margin-bottom:28px;border-bottom:2px solid #111827;padding-bottom:12px}h2{font-size:15px;margin:20px 0 10px;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:6px}table{width:100%;border-collapse:collapse;margin-bottom:16px}th,td{padding:6px 10px;text-align:left;font-size:13px}th{background:#f9fafb;font-weight:600;border-bottom:1px solid #e5e7eb}td{border-bottom:1px solid #f3f4f6}.amount{text-align:right}@media print{body{padding:20px}}</style></head><body>${el.innerHTML}</body></html>`)
    w.document.close(); w.focus(); setTimeout(() => { w.print(); w.close() }, 300)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">{t('finance.title')}</h1><p className="mt-1 text-sm text-gray-500">{t('finance.subtitle')}</p></div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNightAuditConfirm(true)} disabled={auditLoading} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
            {auditLoading ? t('finance.nightAuditing') : t('finance.nightAudit')}
          </button>
          {hasFeature('finance.excelExport') ? (
            <button onClick={async () => { setExporting(true); try { const p = await window.electron.db.exportFinancialLogs(resolvedFrom, resolvedTo); if (p) showAlert({ message: `${t('finance.exportedTo')}：${p}`, variant: 'success' }) } finally { setExporting(false) } }} disabled={exporting || logs.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              {exporting ? t('finance.exporting') : t('finance.export')}
            </button>
          ) : <button disabled className="flex items-center gap-2 px-4 py-2 bg-gray-400 text-white text-sm font-medium rounded-lg opacity-60 cursor-not-allowed"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>{t('finance.export')}<UpgradeBadge requiredEdition="pro" /></button>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {([['today', t('finance.today')], ['month', t('finance.thisMonth')], ['custom', t('finance.custom')]] as const).map(([key, label]) => (
          <button key={key} onClick={() => handleRange(key)} className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${range === key ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'}`}>{label}</button>
        ))}
        {range === 'custom' && <div className="flex items-center gap-2 ml-2"><DatePicker value={dateFrom} onChange={setDateFrom} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" /><span className="text-gray-400 text-sm">{t('finance.to')}</span><DatePicker value={dateTo} onChange={setDateTo} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" /></div>}
      </div>

      {hasFeature('finance.incidentals') && (!showIncidental ? (
        <button onClick={() => setShowIncidental(true)} className="text-sm text-primary-600 hover:text-primary-700 hover:underline">{t('finance.addIncidental')}</button>
      ) : (
        <div className="flex items-end gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="w-32"><Input label={t('finance.incidentalAmount')} id="inc-amount" type="number" value={incAmount} onChange={e => setIncAmount(e.target.value)} /></div>
          <div className="w-28"><Select label={t('finance.incidentalMethod')} id="inc-method" value={incMethod} onChange={e => setIncMethod(e.target.value as 'WeChat' | 'Alipay' | 'Cash')}>{PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></div>
          <div className="w-40"><Select label={t('finance.incidentalOrder')} id="inc-order" value={incOrderId} onChange={e => setIncOrderId(e.target.value)}>
            <option value="">{t('finance.noOrder')}</option>
            {orders.map(o => { const r = rooms.find(rm => rm.room_id === o.room_id); return <option key={o.order_id} value={o.order_id}>{r?.room_number ?? '?'} - {o.guest_name}</option> })}
          </Select></div>
          <button onClick={async () => { await window.electron.db.insertFinancialLog({ order_id: incOrderId ? Number(incOrderId) : null, type: 'INCIDENTAL', amount: Number(incAmount), payment_method: incMethod }); setShowIncidental(false); setIncAmount('100'); setIncOrderId(''); load() }} className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">{t('finance.confirmRecord')}</button>
          <button onClick={() => setShowIncidental(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">{t('common.cancel')}</button>
        </div>
      ))}

      <FinanceSummaryCards summary={summary} locale={i18n.language === 'zh' ? 'zh-CN' : 'en-US'} />

      <div className="grid grid-cols-5 gap-5">
        <Card className="col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">{t('finance.paymentMethodRatio')}</h2>
          {summary && summary.byMethod.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={summary.byMethod} dataKey="total" nameKey="payment_method" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} label={({ name, percent }: any) => `${METHOD_LABEL[name] || name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {summary.byMethod.map(e => <Cell key={e.payment_method} fill={METHOD_COLORS[e.payment_method] || '#9CA3AF'} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `¥${Number(v).toLocaleString('zh-CN')}`} labelFormatter={(l: any) => METHOD_LABEL[l] || l} /></PieChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-56 flex items-center justify-center text-sm text-gray-400">{t('finance.noData')}</div>}
          {summary && summary.byMethod.length > 0 && (
            <div className="flex justify-center gap-5 mt-2">
              {summary.byMethod.map(m => <div key={m.payment_method} className="flex items-center gap-1.5 text-xs text-gray-600"><span className="w-2.5 h-2.5 rounded-full" style={{ background: METHOD_COLORS[m.payment_method] || '#9CA3AF' }} />{METHOD_LABEL[m.payment_method] || m.payment_method}<span className="text-gray-400">¥{m.total.toLocaleString('zh-CN')}</span></div>)}
            </div>
          )}
        </Card>
        <FinanceLogTable logs={logs} typeLabel={TYPE_LABEL} methodLabel={METHOD_LABEL} />
      </div>

      <Dialog open={showNightAuditConfirm} onClose={() => setShowNightAuditConfirm(false)} title={t('finance.nightAuditConfirm')}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t('finance.nightAuditConfirmText')} <span className="font-semibold text-gray-900">{today()}</span> {t('finance.nightAuditConfirmText2')}</p>
          <p className="text-xs text-gray-400">{t('finance.nightAuditHint')}</p>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowNightAuditConfirm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">{t('common.cancel')}</button>
            <button onClick={executeNightAudit} className="px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">{t('finance.confirmExecute')}</button>
          </div>
        </div>
      </Dialog>

      <NightAuditReport open={showNightAuditReport} auditData={auditData} auditExporting={auditExporting}
        onPrint={handlePrintAudit} onExport={async () => { if (!auditData) return; setAuditExporting(true); try { const p = await window.electron.db.exportNightAudit(auditData); if (p) showAlert({ message: `${t('finance.nightAuditExportedTo')}：${p}`, variant: 'success' }) } catch (e) { showAlert({ message: t('finance.exportFailed'), variant: 'error' }) } finally { setAuditExporting(false) } }}
        onClose={() => setShowNightAuditReport(false)} />
      {AlertComponent}
      {ConfirmComponent}
    </div>
  )
}
