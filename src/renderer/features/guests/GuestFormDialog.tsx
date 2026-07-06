import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, Button, Input } from '../../components'
import type { Guest } from '../../../shared/types'

interface Props {
  open: boolean
  guest: Guest | null
  onClose: () => void
  onSaved: () => void
}

export default function GuestFormDialog({ open, guest, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [idCard, setIdCard] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const isEdit = !!guest

  useEffect(() => {
    if (open) {
      if (guest) {
        setName(guest.name)
        setPhone(guest.phone || '')
        setIdCard(guest.id_card || '')
        setEmail(guest.email || '')
        setNotes(guest.notes || '')
      } else {
        setName('')
        setPhone('')
        setIdCard('')
        setEmail('')
        setNotes('')
      }
      setError('')
    }
  }, [open, guest])

  const handleSave = async () => {
    setError('')
    if (!name.trim()) { setError(t('guests.nameRequired')); return }

    setSaving(true)
    try {
      if (isEdit && guest) {
        await window.electron.db.updateGuest(guest.guest_id, {
          name: name.trim(),
          phone: phone.trim() || undefined,
          id_card: idCard.trim() || undefined,
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
        })
      } else {
        await window.electron.db.insertGuest({
          name: name.trim(),
          phone: phone.trim() || undefined,
          id_card: idCard.trim() || undefined,
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
        })
      }
      onSaved()
    } catch (e: any) {
      setError(e?.message || t('guests.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? t('guests.editGuest') : t('guests.addGuest')} maxWidth="sm">
      <div className="space-y-4">
        <Input
          label={t('guests.name')}
          id="guest-form-name"
          value={name}
          onChange={e => { setName(e.target.value); setError('') }}
          placeholder={t('guests.namePlaceholder')}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('guests.phone')}
            id="guest-form-phone"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder={t('guests.optional')}
          />
          <Input
            label={t('guests.idCard')}
            id="guest-form-idcard"
            value={idCard}
            onChange={e => setIdCard(e.target.value)}
            placeholder={t('guests.optional')}
          />
        </div>
        <Input
          label={t('guests.email')}
          id="guest-form-email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={t('guests.optional')}
        />
        <div className="space-y-1.5">
          <label htmlFor="guest-form-notes" className="block text-sm font-medium text-gray-700">{t('guests.notes')}</label>
          <textarea
            id="guest-form-notes"
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={t('guests.notesPlaceholder')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900
              placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500
              focus:border-primary-500 transition-colors resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('guests.saving') : isEdit ? t('common.save') : t('guests.add')}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
