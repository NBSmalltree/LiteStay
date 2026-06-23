import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Button, Dialog, Input, Select } from '../../components'
import type { PriceRule, PriceCalendar, RoomType } from '../../../shared/types'

const RULE_TYPES = [
  { value: 'weekday', label: '平日' },
  { value: 'weekend', label: '周末' },
  { value: 'holiday', label: '节假日' },
  { value: 'custom', label: '自定义' },
]

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
    if (!confirm('确定删除此规则？')) return
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
          <h2 className="text-base font-semibold text-gray-900">规则列表</h2>
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
                            {rule.rule_type === 'weekday' && '平日'}
                            {rule.rule_type === 'weekend' && '周末'}
                            {rule.rule_type === 'holiday' && '节假日'}
                            {rule.rule_type === 'custom' && '自定义'}
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
                          <p className="text-xs text-gray-400">优先级：{rule.priority}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => handleEditRule(rule)}>编辑</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleRule(rule)}>
                          {rule.is_active ? '禁用' : '启用'}
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDeleteRule(rule.rule_id)}>删除</Button>
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
            <h2 className="text-base font-semibold text-gray-900">价格日历</h2>
            <div className="w-48">
              <Select value={calendarRoomType} onChange={e => setCalendarRoomType(e.target.value)}>
                {roomTypes.map(t => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)}
              </Select>
            </div>
          </div>
          <Card>
            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block"></span> 原价</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block"></span> 涨价</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 inline-block"></span> 降价</span>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
              ))}
            </div>

            {calendarLoading ? (
              <div className="text-center py-12 text-gray-400 text-sm">加载中...</div>
            ) : calendar.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">请选择房型查看价格日历</div>
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
                      title={day.applied_rule ? `规则: ${day.applied_rule}` : '基础价格'}
                    >
                      <div className="text-xs text-gray-500">
                        {new Date(day.date + 'T00:00:00').getDate()}日
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
    if (!ruleName.trim()) { setError('请输入规则名称'); return }
    if (!roomType) { setError('请选择房型'); return }
    if (needDateRange) {
      if (!startDate || !endDate) { setError('请填写日期范围'); return }
      if (endDate < startDate) { setError('结束日期不能早于开始日期'); return }
    }
    if (useFixedPrice && (!fixedPrice || Number(fixedPrice) <= 0)) {
      setError('请输入有效的固定价格'); return
    }
    if (!useFixedPrice && Number(priceMultiplier) <= 0) {
      setError('价格倍数必须大于0'); return
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
      setError(e?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={rule ? '编辑规则' : '新增规则'} maxWidth="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select label="房型" value={roomType} onChange={e => setRoomType(e.target.value)}>
            {roomTypes.map(t => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)}
          </Select>
          <Select
            label="规则类型"
            value={ruleType}
            onChange={e => setRuleType(e.target.value as any)}
          >
            {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </div>

        <Input
          label="规则名称"
          value={ruleName}
          onChange={e => setRuleName(e.target.value)}
          placeholder="如：周末上浮、国庆黄金周"
        />

        {needDateRange && (
          <div className="grid grid-cols-2 gap-4">
            <Input label="开始日期" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <Input label="结束日期" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        )}

        {/* Price adjustment */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">价格调整方式</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={!useFixedPrice}
                onChange={() => setUseFixedPrice(false)}
                className="text-primary-600"
              />
              倍数调整
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={useFixedPrice}
                onChange={() => setUseFixedPrice(true)}
                className="text-primary-600"
              />
              固定价格
            </label>
          </div>
          {useFixedPrice ? (
            <Input
              label="固定价格（元）"
              type="number"
              value={fixedPrice}
              onChange={e => setFixedPrice(e.target.value)}
              placeholder="如：300"
            />
          ) : (
            <div>
              <Input
                label="价格倍数"
                type="number"
                step="0.1"
                value={priceMultiplier}
                onChange={e => setPriceMultiplier(e.target.value)}
                placeholder="1.0 = 原价，1.5 = 涨价50%"
              />
              <p className="text-xs text-gray-400 mt-1">
                {Number(priceMultiplier) > 1 && `涨价 ${((Number(priceMultiplier) - 1) * 100).toFixed(0)}%`}
                {Number(priceMultiplier) < 1 && Number(priceMultiplier) > 0 && `降价 ${((1 - Number(priceMultiplier)) * 100).toFixed(0)}%`}
                {Number(priceMultiplier) === 1 && '原价'}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="优先级"
            type="number"
            value={priority}
            onChange={e => setPriority(e.target.value)}
            placeholder="数字越大优先级越高"
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">状态</label>
            <label className="flex items-center gap-2 mt-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="rounded text-primary-600"
              />
              启用
            </label>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
        </div>
      </div>
    </Dialog>
  )
}
