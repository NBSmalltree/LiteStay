import { useState, useEffect } from 'react'
import { Dialog, Input, Button } from './'
import type { RoomType } from '../../shared/types'

interface Props {
  open: boolean
  onClose: () => void
  onChanged: () => void
}

export function RoomTypeManager({ open, onClose, onChanged }: Props) {
  const [types, setTypes] = useState<RoomType[]>([])
  const [newName, setNewName] = useState('豪华套房')
  const [error, setError] = useState('')

  const loadTypes = async () => {
    setTypes(await window.electron.db.getRoomTypes())
  }

  useEffect(() => {
    if (open) loadTypes()
  }, [open])

  const handleAdd = async () => {
    setError('')
    if (!newName.trim()) return
    try {
      await window.electron.db.insertRoomType(newName.trim())
      setNewName('')
      await loadTypes()
      onChanged()
    } catch {
      setError(`「${newName.trim()}」已存在`)
    }
  }

  const handleDelete = async (typeId: number) => {
    await window.electron.db.deleteRoomType(typeId)
    await loadTypes()
    onChanged()
  }

  return (
    <Dialog open={open} onClose={onClose} title="房型配置">
      <div className="space-y-4">
        {/* Add new type */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="新增房型"
              id="new-room-type"
              placeholder="如：豪华套房"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <Button size="md" onClick={handleAdd}>添加</Button>
        </div>
        {error && <p className="text-sm text-red-600 -mt-2">{error}</p>}

        {/* Type list */}
        {types.length > 0 ? (
          <div className="space-y-1">
            {types.map((t) => (
              <div key={t.type_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 group">
                <span className="text-sm text-gray-900">{t.type_name}</span>
                <button
                  onClick={() => handleDelete(t.type_id)}
                  className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-2">暂无房型，请添加</p>
        )}
      </div>
    </Dialog>
  )
}
