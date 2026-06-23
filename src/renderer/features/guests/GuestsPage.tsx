import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Card, Button, Input, Select, Dialog } from '../../components'
import type { GuestWithStats, Guest, GuestOrder } from '../../../shared/types'

interface Props {
  refreshKey: number
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  IN_HOUSE: { bg: 'bg-red-100', text: 'text-red-700' },
  PREBOOK: { bg: 'bg-blue-100', text: 'text-blue-700' },
  CHECKED_OUT: { bg: 'bg-gray-100', text: 'text-gray-600' },
}

const STATUS_LABELS: Record<string, string> = {
  IN_HOUSE: '在住',
  PREBOOK: '预订',
  CHECKED_OUT: '已退房',
}

type SortField = 'name' | 'order_count' | 'total_spent' | 'last_check_in'
type SortDir = 'asc' | 'desc'

export default function GuestsPage({ refreshKey }: Props) {
  const [guests, setGuests] = useState<GuestWithStats[]>([])
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selectedGuest, setSelectedGuest] = useState<GuestWithStats | null>(null)
  const [guestOrders, setGuestOrders] = useState<GuestOrder[]>([])
  const [showDetail, setShowDetail] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null)
  const [localKey, setLocalKey] = useState(0)

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

  const handleDelete = async (guestId: number, name: string) => {
    if (!confirm(`确定删除客人「${name}」？`)) return
    await window.electron.db.deleteGuest(guestId)
    setLocalKey(k => k + 1)
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
          <h1 className="text-2xl font-bold text-gray-900">客人管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理客人档案和历史记录</p>
        </div>
        <Button onClick={handleAddNew}>
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          新增客人
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="text-sm text-gray-500">总客人数</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
        </Card>
        <Card padding="sm">
          <div className="text-sm text-gray-500">本月新客</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{stats.newThisMonth}</div>
        </Card>
        <Card padding="sm">
          <div className="text-sm text-gray-500">回头客</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{stats.returning}</div>
        </Card>
        <Card padding="sm">
          <div className="text-sm text-gray-500">回头率</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{stats.returnRate}%</div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <Input
          type="text"
          placeholder="搜索客人姓名、手机号..."
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
            ? '没有找到匹配的客人'
            : '暂无客人数据，点击「新增客人」添加第一条记录'}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">姓名 <SortIcon field="name" /></div>
                </th>
                <th className="text-left px-4 py-3 font-medium">手机号</th>
                <th className="text-center px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900" onClick={() => handleSort('order_count')}>
                  <div className="flex items-center justify-center gap-1">入住次数 <SortIcon field="order_count" /></div>
                </th>
                <th className="text-right px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900" onClick={() => handleSort('total_spent')}>
                  <div className="flex items-center justify-end gap-1">消费总额 <SortIcon field="total_spent" /></div>
                </th>
                <th className="text-left px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900" onClick={() => handleSort('last_check_in')}>
                  <div className="flex items-center gap-1">最近入住 <SortIcon field="last_check_in" /></div>
                </th>
                <th className="text-left px-4 py-3 font-medium">偏好房型</th>
                <th className="text-right px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(guest => (
                <tr key={guest.guest_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{guest.name}</td>
                  <td className="px-4 py-3 text-gray-600">{guest.phone || '-'}</td>
                  <td className="px-4 py-3 text-center text-gray-900">{guest.order_count}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{guest.total_spent > 0 ? `¥${guest.total_spent.toLocaleString()}` : '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{guest.last_check_in || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{guest.preferred_room_type || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleViewDetail(guest)}
                        className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="查看详情"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { setEditingGuest(guest); setShowForm(true) }}
                        className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="编辑"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(guest.guest_id, guest.name)}
                        className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="删除"
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
    </div>
  )
}

/* --- Guest Detail Dialog --- */
function GuestDetailDialog({
  open, guest, orders, onClose, onEdit,
}: {
  open: boolean
  guest: GuestWithStats | null
  orders: GuestOrder[]
  onClose: () => void
  onEdit: () => void
}) {
  if (!guest) return null

  return (
    <Dialog open={open} onClose={onClose} title="客人详情" maxWidth="lg">
      <div className="grid grid-cols-2 gap-6">
        {/* Left: basic info */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 pb-2 border-b border-gray-200">基本信息</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">姓名</span>
              <span className="text-gray-900 font-medium">{guest.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">手机号</span>
              <span className="text-gray-900">{guest.phone || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">身份证</span>
              <span className="text-gray-900">{guest.id_card || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">邮箱</span>
              <span className="text-gray-900">{guest.email || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">备注</span>
              <span className="text-gray-900">{guest.notes || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">建档日期</span>
              <span className="text-gray-900">{guest.created_at?.slice(0, 10) || '-'}</span>
            </div>
          </div>
        </div>

        {/* Right: stats */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 pb-2 border-b border-gray-200">消费统计</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">入住次数</span>
              <span className="text-gray-900 font-medium">{guest.order_count} 次</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">消费总额</span>
              <span className="text-gray-900 font-medium text-green-600">
                {guest.total_spent > 0 ? `¥${guest.total_spent.toLocaleString()}` : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">最近入住</span>
              <span className="text-gray-900">{guest.last_check_in || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">偏好房型</span>
              <span className="text-gray-900">{guest.preferred_room_type || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order history */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-900 pb-2 border-b border-gray-200 mb-3">历史订单</h3>
        {orders.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">暂无订单记录</div>
        ) : (
          <div className="max-h-60 overflow-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">房号</th>
                  <th className="text-left px-3 py-2 font-medium">房型</th>
                  <th className="text-left px-3 py-2 font-medium">入住</th>
                  <th className="text-left px-3 py-2 font-medium">退房</th>
                  <th className="text-left px-3 py-2 font-medium">状态</th>
                  <th className="text-right px-3 py-2 font-medium">房费</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(order => {
                  const style = STATUS_STYLES[order.status] || STATUS_STYLES.CHECKED_OUT
                  return (
                    <tr key={order.order_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-900 font-medium">{order.room_number}</td>
                      <td className="px-3 py-2 text-gray-600">{order.room_type}</td>
                      <td className="px-3 py-2 text-gray-600">{order.check_in_date}</td>
                      <td className="px-3 py-2 text-gray-600">{order.check_out_date}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">¥{order.actual_amount}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="secondary" onClick={onClose}>关闭</Button>
        <Button onClick={onEdit}>编辑信息</Button>
      </div>
    </Dialog>
  )
}

/* --- Guest Form Dialog --- */
function GuestFormDialog({
  open, guest, onClose, onSaved,
}: {
  open: boolean
  guest: Guest | null
  onClose: () => void
  onSaved: () => void
}) {
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
    if (!name.trim()) { setError('请输入客人姓名'); return }

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
      setError(e?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? '编辑客人' : '新增客人'} maxWidth="sm">
      <div className="space-y-4">
        <Input
          label="姓名"
          id="guest-form-name"
          value={name}
          onChange={e => { setName(e.target.value); setError('') }}
          placeholder="客人姓名"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="手机号"
            id="guest-form-phone"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="可选"
          />
          <Input
            label="身份证"
            id="guest-form-idcard"
            value={idCard}
            onChange={e => setIdCard(e.target.value)}
            placeholder="可选"
          />
        </div>
        <Input
          label="邮箱"
          id="guest-form-email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="可选"
        />
        <div className="space-y-1.5">
          <label htmlFor="guest-form-notes" className="block text-sm font-medium text-gray-700">备注</label>
          <textarea
            id="guest-form-notes"
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="特殊需求、偏好..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900
              placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500
              focus:border-primary-500 transition-colors resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : isEdit ? '保存' : '添加'}</Button>
        </div>
      </div>
    </Dialog>
  )
}
