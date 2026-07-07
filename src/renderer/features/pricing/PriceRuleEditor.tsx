import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, Input, Select, DatePicker, Button } from '../../components'
import { useEdition } from '../../hooks/useEdition'
import type { PriceRule, RoomType } from '../../../shared/types'

interface Props {
  open: boolean
  rule: PriceRule | null
  roomTypes: RoomType[]
  onClose: () => void
  onSaved: () => void
}

export default function PriceRuleEditor({ open, rule, roomTypes, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const { hasFeature } = useEdition()
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
    ...(hasFeature('pricing.holidayRules') ? [{ value: 'holiday', label: t('pricing.holiday') }, { value: 'custom', label: t('pricing.custom') }] : []),
  ]

  const needDateRange = ruleType === 'holiday' || ruleType === 'custom'

  useEffect(() => {
    if (open) {
      if (rule) {
        setRoomType(rule.room_type); setRuleName(rule.rule_name); setRuleType(rule.rule_type)
        setStartDate(rule.start_date || ''); setEndDate(rule.end_date || '')
        setPriceMultiplier(String(rule.price_multiplier)); setFixedPrice(rule.fixed_price ? String(rule.fixed_price) : '')
        setUseFixedPrice(!!rule.fixed_price); setPriority(String(rule.priority)); setIsActive(rule.is_active)
      } else {
        setRoomType(roomTypes[0]?.type_name || ''); setRuleName(''); setRuleType('weekday')
        setStartDate(''); setEndDate(''); setPriceMultiplier('1.0'); setFixedPrice('')
        setUseFixedPrice(false); setPriority('0'); setIsActive(true)
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
    if (useFixedPrice && (!fixedPrice || Number(fixedPrice) <= 0)) { setError(t('pricing.enterFixedPrice')); return }
    if (!useFixedPrice && Number(priceMultiplier) <= 0) { setError(t('pricing.multiplierMustPositive')); return }
    setSaving(true)
    try {
      const data = {
        room_type: roomType, rule_name: ruleName.trim(), rule_type: ruleType,
        start_date: needDateRange ? startDate : undefined, end_date: needDateRange ? endDate : undefined,
        price_multiplier: useFixedPrice ? 1.0 : Number(priceMultiplier), fixed_price: useFixedPrice ? Number(fixedPrice) : undefined,
        priority: Number(priority), is_active: isActive,
      }
      if (rule) await window.electron.db.updatePriceRule(rule.rule_id, data)
      else await window.electron.db.insertPriceRule(data)
      onSaved()
    } catch (e: any) { setError(e?.message || t('pricing.saveFailed')) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} title={rule ? t('pricing.editRule') : t('pricing.newRule')} maxWidth="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select label={t('pricing.roomType')} value={roomType} onChange={e => setRoomType(e.target.value)}>
            {roomTypes.map(t => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)}
          </Select>
          <Select label={t('pricing.ruleType')} value={ruleType} onChange={e => setRuleType(e.target.value as 'weekday' | 'weekend' | 'holiday' | 'custom')}>
            {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </div>
        <Input label={t('pricing.ruleName')} value={ruleName} onChange={e => setRuleName(e.target.value)} placeholder={t('pricing.ruleNamePlaceholder')} />
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
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">{t('pricing.priceAdjustment')}</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="radio" checked={!useFixedPrice} onChange={() => setUseFixedPrice(false)} className="text-primary-600" />{t('pricing.multiplier')}</label>
            <label className="flex items-center gap-2 text-sm"><input type="radio" checked={useFixedPrice} onChange={() => setUseFixedPrice(true)} className="text-primary-600" />{t('pricing.fixedPrice')}</label>
          </div>
          {useFixedPrice ? <Input label={t('pricing.fixedPriceUnit')} type="number" value={fixedPrice} onChange={e => setFixedPrice(e.target.value)} placeholder={t('pricing.fixedPricePlaceholder')} />
          : <div><Input label={t('pricing.multiplier')} type="number" step="0.1" value={priceMultiplier} onChange={e => setPriceMultiplier(e.target.value)} placeholder={t('pricing.multiplierHint')} />
            <p className="text-xs text-gray-400 mt-1">
              {Number(priceMultiplier) > 1 && `${t('pricing.priceIncrease')} ${((Number(priceMultiplier) - 1) * 100).toFixed(0)}%`}
              {Number(priceMultiplier) < 1 && Number(priceMultiplier) > 0 && `${t('pricing.priceDecrease')} ${((1 - Number(priceMultiplier)) * 100).toFixed(0)}%`}
              {Number(priceMultiplier) === 1 && t('pricing.basePrice')}
            </p></div>
          }
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('pricing.priority')} type="number" value={priority} onChange={e => setPriority(e.target.value)} placeholder={t('pricing.priorityHint')} />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">{t('pricing.status')}</label>
            <label className="flex items-center gap-2 mt-2 text-sm"><input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded text-primary-600" />{t('pricing.active')}</label>
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
