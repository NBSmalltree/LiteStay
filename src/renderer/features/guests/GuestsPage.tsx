import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Button, Input, Select } from '../../components'
import { useEdition } from '../../hooks/useEdition'
import { useDialogs } from '../../components/useDialogs'
import UpgradeBadge from '../../components/UpgradeBadge'
import GuestDetailDialog from './GuestDetailDialog'
import GuestFormDialog from './GuestFormDialog'
import type { GuestWithStats, Guest } from '../../../shared/types'

interface Props {
  refreshKey: number
}

type SortField = 'name' | 'order_count' | 'total_spent' | 'last_check_in'
type SortDir = 'asc' | 'desc'

export default function GuestsPage({ refreshKey }: Props) {
  const { t } = useTranslation()
  const { hasFeature } = useEdition()
  const { showAlert, showConfirm, AlertComponent, ConfirmComponent } = useDialogs()
  const [guests, setGuests] = useState<GuestWithStats[]>([])
  const [pendingDelete, setPendingDelete] = useState<{ id: number; name: string } | null>(null)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selectedGuest, setSelectedGuest] = useState<GuestWithStats | null>(null)
  const [guestOrders, setGuestOrders] = useState<GuestOrder[]>([])
  const [showDetail, setShowDetail] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null)
  const [localKey, setLocalKey] = useState(0)

  // Confirm delete dialog
  useEffect(() => {
    if (!pendingDelete) return
    const { id, name } = pendingDelete
    showConfirm({
      title: t('common.confirm'),
      message: t('guests.confirmDelete', { name }),
      variant: 'danger',
      onConfirm: async () => {
        const result = await window.electron.db.deleteGuest(id)
        if (result !== true && result.error) {
          showAlert({ message: t('guests.hasRelatedOrders'), variant: 'error' })
          return
        }
        setLocalKey(k => k + 1)
      },
    })
    setPendingDelete(null)
  }, [pendingDelete])

  // Load guests
  useEffect(() => {
    Promise.resolve(window.electron.db.getGuestsWithStats()).then(setGuests)
  }, [refreshKey, localKey])

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  // Filter and sort
  const filtered = useMemo(() => {
    let result = guests

    // Search filter
    const q = debouncedSearch.trim().toLowerCase()
    if (q) {
      result = result.filter(g =>
        g.name.toLowerCase().includes(q) ||
        (g.phone && g.phone.includes(q)) ||
        (g.id_card && g.id_card.includes(q))
      )
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0
      if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name, 'zh-CN')
      } else if (sortField === 'order_count') {
        cmp = a.order_count - b.order_count
      } else if (sortField === 'total_spent') {
        cmp = a.total_spent - b.total_spent
      } else if (sortField === 'last_check_in') {
        cmp = (a.last_check_in || '').localeCompare(b.last_check_in || '')
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [guests, debouncedSearch, sortField, sortDir])

  // Summary stats
  const stats = useMemo(() => {
    const total = guests.length
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const newThisMonth = guests.filter(g => g.created_at >= monthStart).length
    const returning = guests.filter(g => g.order_count > 1).length
    const returnRate = total > 0 ? Math.round((returning / total) * 100) : 0
    return { total, newThisMonth, returning, returnRate }
  }, [guests])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const handleViewDetail = async (guest: GuestWithStats) => {
    setSelectedGuest(guest)
    const orders = await window.electron.db.getGuestOrders(guest.name)
    setGuestOrders(orders)
    setShowDetail(true)
  }

  const handleDeleteClick = (guestId: number, name: string) => {
    setPendingDelete({ id: guestId, name })
  }

  const handleEditFromDetail = () => {
    if (selectedGuest) {
      setEditingGuest(selectedGuest)
      setShowDetail(false)
      setShowForm(true)
    }
  }

  const handleAddNew = () => {
    setEditingGuest(null)
    setShowForm(true)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
        </svg>
      )
    }
    return sortDir === 'asc' ? (
      <svg className="w-3 h-3 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('guests.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('guests.subtitle')}</p>
        </div>
        <Button onClick={handleAddNew}>
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t('guests.addGuest')}
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="text-sm text-gray-500">{t('guests.totalGuests')}</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
        </Card>
        <Card padding="sm">
          <div className="text-sm text-gray-500">{t('guests.newThisMonth')}</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{stats.newThisMonth}</div>
        </Card>
        {hasFeature('guest.consumptionStats') && (
          <>
            <Card padding="sm">
              <div className="text-sm text-gray-500">{t('guests.returningGuests')}</div>
              <div className="text-2xl font-bold text-green-600 mt-1">{stats.returning}</div>
            </Card>
            <Card padding="sm">
              <div className="text-sm text-gray-500">{t('guests.returnRate')}</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">{stats.returnRate}%</div>
            </Card>
          </>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <Input
          type="text"
          placeholder={t('guests.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 pr-9"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {debouncedSearch.trim()
            ? t('guests.noMatchFound')
            : t('guests.noGuests')}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">{t('guests.name')} <SortIcon field="name" /></div>
                </th>
                <th className="text-left px-4 py-3 font-medium">{t('guests.phone')}</th>
                {hasFeature('guest.sort') && (
                  <>
                    <th className="text-center px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900" onClick={() => handleSort('order_count')}>
                      <div className="flex items-center justify-center gap-1">{t('guests.orderCount')} <SortIcon field="order_count" /></div>
                    </th>
                    <th className="text-right px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900" onClick={() => handleSort('total_spent')}>
                      <div className="flex items-center justify-end gap-1">{t('guests.totalSpent')} <SortIcon field="total_spent" /></div>
                    </th>
                    <th className="text-left px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900" onClick={() => handleSort('last_check_in')}>
                      <div className="flex items-center gap-1">{t('guests.lastCheckIn')} <SortIcon field="last_check_in" /></div>
                    </th>
                  </>
                )}
                {hasFeature('guest.preferredRoomType') && (
                  <th className="text-left px-4 py-3 font-medium">{t('guests.preferredRoomType')}</th>
                )}
                <th className="text-right px-4 py-3 font-medium">{t('guests.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(guest => (
                <tr key={guest.guest_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{guest.name}</td>
                  <td className="px-4 py-3 text-gray-600">{guest.phone || '-'}</td>
                  {hasFeature('guest.sort') && (
                    <>
                      <td className="px-4 py-3 text-center text-gray-900">{guest.order_count}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{guest.total_spent > 0 ? `¥${guest.total_spent.toLocaleString()}` : '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{guest.last_check_in || '-'}</td>
                    </>
                  )}
                  {hasFeature('guest.preferredRoomType') && (
                    <td className="px-4 py-3 text-gray-600">{guest.preferred_room_type || '-'}</td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {hasFeature('guest.historyOrders') && (
                        <button
                          onClick={() => handleViewDetail(guest)}
                          className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title={t('guests.viewDetail')}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingGuest(guest); setShowForm(true) }}
                        className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title={t('common.edit')}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(guest.guest_id, guest.name)}
                        className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title={t('common.delete')}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Guest Detail Dialog */}
      <GuestDetailDialog
        open={showDetail}
        guest={selectedGuest}
        orders={guestOrders}
        onClose={() => { setShowDetail(false); setSelectedGuest(null); setGuestOrders([]) }}
        onEdit={handleEditFromDetail}
      />

      {/* Guest Form Dialog */}
      <GuestFormDialog
        open={showForm}
        guest={editingGuest}
        onClose={() => { setShowForm(false); setEditingGuest(null) }}
        onSaved={() => { setShowForm(false); setEditingGuest(null); setLocalKey(k => k + 1) }}
      />

      {AlertComponent}
      {ConfirmComponent}
    </div>
  )
}