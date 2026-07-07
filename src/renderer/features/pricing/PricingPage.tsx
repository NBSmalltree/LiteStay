import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Button, Select, useDialogs } from '../../components'
import PriceRuleEditor from './PriceRuleEditor'
import type { PriceRule, PriceCalendar, RoomType } from '../../../shared/types'

interface Props { refreshKey: number }

export default function PricingPage({ refreshKey }: Props) {
  const { t } = useTranslation()
  const [rules, setRules] = useState<PriceRule[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [calendarRoomType, setCalendarRoomType] = useState('')
  const [calendar, setCalendar] = useState<PriceCalendar[]>([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editingRule, setEditingRule] = useState<PriceRule | null>(null)
  const { showConfirm, ConfirmComponent } = useDialogs()

  const loadRules = async () => setRules(await window.electron.db.getPriceRules())
  const loadRoomTypes = async () => {
    const types = await window.electron.db.getRoomTypes()
    setRoomTypes(types)
    if (types.length > 0 && !calendarRoomType) setCalendarRoomType(types[0].type_name)
  }

  useEffect(() => { loadRules(); loadRoomTypes() }, [refreshKey])

  useEffect(() => {
    if (!calendarRoomType) return
    setCalendarLoading(true)
    const d = new Date()
    const dateTo = new Date(d); dateTo.setDate(dateTo.getDate() + 29)
    window.electron.db.getPriceCalendar(calendarRoomType, d.toISOString().slice(0, 10), dateTo.toISOString().slice(0, 10))
      .then(setCalendar).finally(() => setCalendarLoading(false))
  }, [calendarRoomType, rules])

  const rulesByType = useMemo(() => {
    const groups: Record<string, PriceRule[]> = {}
    for (const rule of rules) { (groups[rule.room_type] ||= []).push(rule) }
    return groups
  }, [rules])

  const handleDeleteRule = (ruleId: number) => showConfirm({
    title: t('common.confirm'), message: t('pricing.confirmDelete'), confirmText: t('common.delete'), variant: 'danger',
    onConfirm: async () => { await window.electron.db.deletePriceRule(ruleId); await loadRules() },
  })

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">{t('pricing.title')}</h1><p className="mt-1 text-sm text-gray-500">{t('pricing.subtitle')}</p></div>
        <Button onClick={() => { setEditingRule(null); setShowDialog(true) }}>{t('pricing.addRule')}</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">{t('pricing.ruleList')}</h2>
          {rules.length === 0 ? (
            <Card><div className="text-center py-8 text-gray-400 text-sm">{t('pricing.noRules')}</div></Card>
          ) : Object.entries(rulesByType).map(([type, typeRules]) => (
            <div key={type}>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{type}</h3>
              <div className="space-y-2">
                {typeRules.map(rule => (
                  <Card key={rule.rule_id} padding="sm" className={rule.is_active ? '' : 'opacity-50'}>
                    <div className="flex items-center justify-between">
                      <div><h3 className="font-medium text-gray-900">{rule.rule_name}</h3>
                        <p className="text-sm text-gray-500">
                          {rule.rule_type === 'weekday' && t('pricing.weekday')}{rule.rule_type === 'weekend' && t('pricing.weekend')}
                          {rule.rule_type === 'holiday' && t('pricing.holiday')}{rule.rule_type === 'custom' && t('pricing.custom')}
                          {rule.start_date && ` (${rule.start_date} ~ ${rule.end_date})`}
                        </p>
                      </div>
                      <div className="text-right">
                        {rule.fixed_price ? <span className="text-lg font-bold text-gray-900">¥{rule.fixed_price}</span>
                        : <span className="text-lg font-bold text-gray-900">{rule.price_multiplier > 1 ? '+' : ''}{((rule.price_multiplier - 1) * 100).toFixed(0)}%</span>}
                        <p className="text-xs text-gray-400">{t('pricing.priority')}：{rule.priority}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => { setEditingRule(rule); setShowDialog(true) }}>{t('common.edit')}</Button>
                      <Button variant="ghost" size="sm" onClick={async () => { await window.electron.db.updatePriceRule(rule.rule_id, { is_active: !rule.is_active }); await loadRules() }}>
                        {rule.is_active ? t('pricing.inactive') : t('pricing.active')}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteRule(rule.rule_id)}>{t('common.delete')}</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">{t('pricing.calendar')}</h2>
            <div className="w-48"><Select value={calendarRoomType} onChange={e => setCalendarRoomType(e.target.value)}>{roomTypes.map(t => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)}</Select></div>
          </div>
          <Card>
            <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block" /> {t('pricing.originalPrice')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block" /> {t('pricing.priceUp')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 inline-block" /> {t('pricing.priceDown')}</span>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {[t('weekdays.sun'), t('weekdays.mon'), t('weekdays.tue'), t('weekdays.wed'), t('weekdays.thu'), t('weekdays.fri'), t('weekdays.sat')].map(d => <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>)}
            </div>
            {calendarLoading ? <div className="text-center py-12 text-gray-400 text-sm">{t('common.loading')}</div>
            : calendar.length === 0 ? <div className="text-center py-12 text-gray-400 text-sm">{t('pricing.selectRoomTypeToView')}</div>
            : <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: new Date(calendar[0].date + 'T00:00:00').getDay() }).map((_, i) => <div key={`pad-${i}`} />)}
              {calendar.map(day => {
                const isToday = day.date === todayStr
                const priceDiff = day.final_price - day.base_price
                const bg = priceDiff > 0 ? 'bg-red-50' : priceDiff < 0 ? 'bg-blue-50' : 'bg-green-50'
                const tc = priceDiff > 0 ? 'text-red-700' : priceDiff < 0 ? 'text-blue-700' : 'text-green-700'
                return <div key={day.date} className={`p-2 rounded text-center ${bg} ${isToday ? 'ring-2 ring-primary-500' : ''}`} title={day.applied_rule ? `${t('pricing.rulePrefix')}${day.applied_rule}` : t('pricing.noRule')}>
                  <div className="text-xs text-gray-500">{new Date(day.date + 'T00:00:00').getDate()}{t('pricing.daySuffix')}</div>
                  <div className={`font-medium text-sm ${tc}`}>¥{day.final_price}</div>
                  {day.applied_rule && <div className="text-xs text-gray-400 truncate">{day.applied_rule}</div>}
                </div>
              })}
            </div>}
          </Card>
        </div>
      </div>

      {ConfirmComponent}
      <PriceRuleEditor open={showDialog} rule={editingRule} roomTypes={roomTypes} onClose={() => setShowDialog(false)} onSaved={async () => { setShowDialog(false); await loadRules() }} />
    </div>
  )
}
