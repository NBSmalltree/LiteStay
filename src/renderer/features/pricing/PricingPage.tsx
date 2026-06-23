import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Button, Dialog, Input, Select, DatePicker } from '../../components'
import type { PriceRule, PriceCalendar, RoomType } from '../../../shared/types'

interface PricingPageProps {
  refreshKey: number
}

export default function PricingPage({ refreshKey }: PricingPageProps) {
  const { t } = useTranslation()
  const [rules, setRules] = useState<PriceRule[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [calendarRoomType, setCalendarRoomType] = useState('')
  const [calendar, setCalendar] = useState<PriceCalendar[]>([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editingRule, setEditingRule] = useState<PriceRule | null>(null)

  // Load data
  const loadRules = async () => {
    const data = await window.electron.db.getPriceRules()
    setRules(data)
  }

  const loadRoomTypes = async () => {
    const types = await window.electron.db.getRoomTypes()
    setRoomTypes(types)
    if (types.length > 0 && !calendarRoomType) {
      setCalendarRoomType(types[0].type_name)
    }
  }

  useEffect(() => {
    loadRules()
    loadRoomTypes()
  }, [refreshKey])

  // Load calendar when room type changes
  useEffect(() => {
    if (!calendarRoomType) return
    const loadCalendar = async () => {
      setCalendarLoading(true)
      const today = new Date()
      const dateFrom = today.toISOString().slice(0, 10)
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + 29)
      const dateTo = endDate.toISOString().slice(0, 10)
      const data = await window.electron.db.getPriceCalendar(calendarRoomType, dateFrom, dateTo)
      setCalendar(data)
      setCalendarLoading(false)
    }
    loadCalendar()
  }, [calendarRoomType, rules])

  // Group rules by room type
  const rulesByType = useMemo(() => {
    const groups: Record<string, PriceRule[]> = {}
    for (const rule of rules) {
      if (!groups[rule.room_type]) groups[rule.room_type] = []
      groups[rule.room_type].push(rule)
    }
    return groups
  }, [rules])

  const handleAddRule = () => {
    setEditingRule(null)
    setShowDialog(true)
  }

  const handleEditRule = (rule: PriceRule) => {
    setEditingRule(rule)
    setShowDialog(true)
  }

  const handleToggleRule = async (rule: PriceRule) => {
    await window.electron.db.updatePriceRule(rule.rule_id, { is_active: !rule.is_active })
    await loadRules()
  }

  const handleDeleteRule = async (ruleId: number) => {
    if (!confirm(t('pricing.confirmDelete'))) return
    await window.electron.db.deletePriceRule(ruleId)
    await loadRules()
  }

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('pricing.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('pricing.subtitle')}</p>
        </div>
        <Button onClick={handleAddRule}>{t('pricing.addRule')}</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Rule list */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">{t('pricing.ruleList')}</h2>
          {rules.length === 0 ? (
            <Card>
              <div className="text-center py-8 text-gray-400 text-sm">
                {t('pricing.noRules')}
              </div>
            </Card>
          ) : (
            Object.entries(rulesByType).map(([type, typeRules]) => (
              <div key={type}>
                <h3 className="text-sm font-medium text-gray-500 mb-2">{type}</h3>
                <div className="space-y-2">
                  {typeRules.map(rule => (
                    <Card key={rule.rule_id} padding="sm" className={rule.is_active ? '' : 'opacity-50'}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{rule.rule_name}</h3>
                          <p className="text-sm text-gray-500">
                            {rule.rule_type === 'weekday' && t('pricing.weekday')}
                            {rule.rule_type === 'weekend' && t('pricing.weekend')}
                            {rule.rule_type === 'holiday' && t('pricing.holiday')}
                            {rule.rule_type === 'custom' && t('pricing.custom')}
                            {rule.start_date && ` (${rule.start_date} ~ ${rule.end_date})`}
                          </p>
                        </div>
                        <div className="text-right">
                          {rule.fixed_price ? (
                            <span className="text-lg font-bold text-gray-900">¥{rule.fixed_price}</span>
                          ) : (
                            <span className="text-lg font-bold text-gray-900">
                              {rule.price_multiplier > 1 ? '+' : ''}
                              {((rule.price_multiplier - 1) * 100).toFixed(0)}%
                            </span>
                          )}
                          <p className="text-xs text-gray-400">{t('pricing.priority')}：{rule.priority}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => handleEditRule(rule)}>{t('common.edit')}</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleRule(rule)}>
                          {rule.is_active ? t('pricing.inactive') : t('pricing.active')}
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDeleteRule(rule.rule_id)}>{t('common.delete')}</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right: Price calendar */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">{t('pricing.calendar')}</h2>
            <div className="w-48">
              <Select value={calendarRoomType} onChange={e => setCalendarRoomType(e.target.value)}>
                {roomTypes.map(t => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)}
              </Select>
            </div>
          </div>
          <Card>
            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block"></span> {t('pricing.originalPrice')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block"></span> {t('pricing.priceUp')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 inline-block"></span> {t('pricing.priceDown')}</span>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {[t('weekdays.sun'), t('weekdays.mon'), t('weekdays.tue'), t('weekdays.wed'), t('weekdays.thu'), t('weekdays.fri'), t('weekdays.sat')].map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
              ))}
            </div>

            {calendarLoading ? (
              <div className="text-center py-12 text-gray-400 text-sm">{t('common.loading')}</div>
            ) : calendar.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">{t('pricing.selectRoomTypeToView')}</div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {/* Pad leading empty cells */}
                {(() => {
                  const firstDay = new Date(calendar[0].date + 'T00:00:00').getDay()
                  const pads = []
                  for (let i = 0; i < firstDay; i++) {
                    pads.push(<div key={`pad-${i}`} />)
                  }
                  return pads
                })()}
                {calendar.map(day => {
                  const isToday = day.date === todayStr
                  const priceDiff = day.final_price - day.base_price
                  const bgColor = priceDiff > 0 ? 'bg-red-50' : priceDiff < 0 ? 'bg-blue-50' : 'bg-green-50'
                  const textColor = priceDiff > 0 ? 'text-red-700' : priceDiff < 0 ? 'text-blue-700' : 'text-green-700'

                  return (
                    <div
                      key={day.date}
                      className={`p-2 rounded text-center ${bgColor} ${isToday ? 'ring-2 ring-primary-500' : ''}`}
                      title={day.applied_rule ? `${t('pricing.rulePrefix')}${day.applied_rule}` : t('pricing.noRule')}
                    >
                      <div className="text-xs text-gray-500">
                        {new Date(day.date + 'T00:00:00').getDate()}{t('pricing.daySuffix')}
                      </div>
                      <div className={`font-medium text-sm ${textColor}`}>¥{day.final_price}</div>
                      {day.applied_rule && (
                        <div className="text-xs text-gray-400 truncate">{day.applied_rule}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Rule edit dialog */}
      <RuleEditDialog
        open={showDialog}
        rule={editingRule}
        roomTypes={roomTypes}
        onClose={() => setShowDialog(false)}
        onSaved={async () => {
          setShowDialog(false)
          await loadRules()
        }}
      />
    </div>
  )
}

// --- Rule Edit Dialog ---
function RuleEditDialog({
  open, rule, roomTypes, onClose, onSaved,
}: {
  open: boolean
  rule: PriceRule | null
  roomTypes: RoomType[]
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [roomType, setRoomType] = useState('')
  const [ruleName, setRuleName] = useState('')
  const [ruleType, setRuleType] = useState<'weekday' | 'weekend' | 'holiday' | 'custom'>('weekday')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [priceMultiplier, setPriceMultiplier] = useState('1.0')
  const [fixedPrice, setFixedPrice] = useState('')
  const [useFixedPrice, setUseFixedPrice] = useState(false)
  const [priority, setPriority] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const RULE_TYPES = [
    { value: 'weekday', label: t('pricing.weekday') },
    { value: 'weekend', label: t('pricing.weekend') },
    { value: 'holiday', label: t('pricing.holiday') },
    { value: 'custom', label: t('pricing.custom') },
  ]

  const needDateRange = ruleType === 'holiday' || ruleType === 'custom'

  useEffect(() => {
    if (open) {
      if (rule) {
        setRoomType(rule.room_type)
        setRuleName(rule.rule_name)
        setRuleType(rule.rule_type)
        setStartDate(rule.start_date || '')
        setEndDate(rule.end_date || '')
        setPriceMultiplier(String(rule.price_multiplier))
        setFixedPrice(rule.fixed_price ? String(rule.fixed_price) : '')
        setUseFixedPrice(!!rule.fixed_price)
        setPriority(String(rule.priority))
        setIsActive(rule.is_active)
      } else {
        setRoomType(roomTypes[0]?.type_name || '')
        setRuleName('')
        setRuleType('weekday')
        setStartDate('')
        setEndDate('')
        setPriceMultiplier('1.0')
        setFixedPrice('')
        setUseFixedPrice(false)
        setPriority('0')
        setIsActive(true)
      }
      setError('')
    }
  }, [open, rule, roomTypes])

  const handleSave = async () => {
    setError('')
    if (!ruleName.trim()) { setError(t('pricing.enterRuleName')); return }
    if (!roomType) { setError(t('pricing.selectRoomType')); return }
    if (needDateRange) {
      if (!startDate || !endDate) { setError(t('pricing.enterDateRange')); return }
      if (endDate < startDate) { setError(t('pricing.endDateAfterStart')); return }
    }
    if (useFixedPrice && (!fixedPrice || Number(fixedPrice) <= 0)) {
      setError(t('pricing.enterFixedPrice')); return
    }
    if (!useFixedPrice && Number(priceMultiplier) <= 0) {
      setError(t('pricing.multiplierMustPositive')); return
    }

    setSaving(true)
    try {
      const data = {
        room_type: roomType,
        rule_name: ruleName.trim(),
        rule_type: ruleType,
        start_date: needDateRange ? startDate : undefined,
        end_date: needDateRange ? endDate : undefined,
        price_multiplier: useFixedPrice ? 1.0 : Number(priceMultiplier),
        fixed_price: useFixedPrice ? Number(fixedPrice) : undefined,
        priority: Number(priority),
        is_active: isActive,
      }

      if (rule) {
        await window.electron.db.updatePriceRule(rule.rule_id, data)
      } else {
        await window.electron.db.insertPriceRule(data as any)
      }
      onSaved()
    } catch (e: any) {
      setError(e?.message || t('pricing.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={rule ? t('pricing.editRule') : t('pricing.newRule')} maxWidth="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select label={t('pricing.roomType')} value={roomType} onChange={e => setRoomType(e.target.value)}>
            {roomTypes.map(t => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)}
          </Select>
          <Select
            label={t('pricing.ruleType')}
            value={ruleType}
            onChange={e => setRuleType(e.target.value as any)}
          >
            {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </div>

        <Input
          label={t('pricing.ruleName')}
          value={ruleName}
          onChange={e => setRuleName(e.target.value)}
          placeholder={t('pricing.ruleNamePlaceholder')}
        />

        {needDateRange && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">{t('pricing.startDate')}</label>
              <DatePicker value={startDate} onChange={setStartDate} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">{t('pricing.endDate')}</label>
              <DatePicker value={endDate} onChange={setEndDate} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
            </div>
          </div>
        )}

        {/* Price adjustment */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">{t('pricing.priceAdjustment')}</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={!useFixedPrice}
                onChange={() => setUseFixedPrice(false)}
                className="text-primary-600"
              />
              {t('pricing.multiplier')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={useFixedPrice}
                onChange={() => setUseFixedPrice(true)}
                className="text-primary-600"
              />
              {t('pricing.fixedPrice')}
            </label>
          </div>
          {useFixedPrice ? (
            <Input
              label={t('pricing.fixedPriceUnit')}
              type="number"
              value={fixedPrice}
              onChange={e => setFixedPrice(e.target.value)}
              placeholder={t('pricing.fixedPricePlaceholder')}
            />
          ) : (
            <div>
              <Input
                label={t('pricing.multiplier')}
                type="number"
                step="0.1"
                value={priceMultiplier}
                onChange={e => setPriceMultiplier(e.target.value)}
                placeholder={t('pricing.multiplierHint')}
              />
              <p className="text-xs text-gray-400 mt-1">
                {Number(priceMultiplier) > 1 && `${t('pricing.priceIncrease')} ${((Number(priceMultiplier) - 1) * 100).toFixed(0)}%`}
                {Number(priceMultiplier) < 1 && Number(priceMultiplier) > 0 && `${t('pricing.priceDecrease')} ${((1 - Number(priceMultiplier)) * 100).toFixed(0)}%`}
                {Number(priceMultiplier) === 1 && t('pricing.basePrice')}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('pricing.priority')}
            type="number"
            value={priority}
            onChange={e => setPriority(e.target.value)}
            placeholder={t('pricing.priorityHint')}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">{t('pricing.status')}</label>
            <label className="flex items-center gap-2 mt-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="rounded text-primary-600"
              />
              {t('pricing.active')}
            </label>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? t('pricing.saving') : t('common.save')}</Button>
        </div>
      </div>
    </Dialog>
  )
}
