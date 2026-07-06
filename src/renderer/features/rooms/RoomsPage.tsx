import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Button, Input, Select, useDialogs } from '../../components'
import type { Room, RoomType } from '../../../shared/types'

interface Props {
  rooms: Room[]
  roomTypes: RoomType[]
  roomNumber: string
  setRoomNumber: (v: string) => void
  roomType: string
  setRoomType: (v: string) => void
  roomPrice: string
  setRoomPrice: (v: string) => void
  onInsertRoom: () => void
  formError: string
  setFormError: (v: string) => void
  onOpenTypeManager: () => void
  onDeleteRoom: (roomId: number) => void
  onUpdateRoom: (roomId: number, updates: Partial<Pick<Room, 'room_type' | 'base_price'>>) => void
}

export default function RoomsPage({
  rooms, roomTypes, roomNumber, setRoomNumber, roomType, setRoomType,
  roomPrice, setRoomPrice, onInsertRoom, formError, setFormError, onOpenTypeManager, onDeleteRoom, onUpdateRoom,
}: Props) {
  const { t } = useTranslation()
  const { showAlert, showConfirm, AlertComponent, ConfirmComponent } = useDialogs()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editType, setEditType] = useState('')
  const [editPrice, setEditPrice] = useState('')

  const startEdit = (r: Room) => {
    setEditingId(r.room_id)
    setEditType(r.room_type)
    setEditPrice(String(r.base_price))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('roomsPage.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('roomsPage.subtitle')}</p>
      </div>

      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-4">{t('roomsPage.addRoom')}</h2>
        {roomTypes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 mb-3">{t('roomsPage.configureTypeFirst')}</p>
            <Button onClick={onOpenTypeManager}>{t('roomsPage.goConfigure')}</Button>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-3 mb-2">
              <div className="w-32">
                <Input label={t('roomsPage.roomNumber')} id="room-number" value={roomNumber} onChange={(e) => { setRoomNumber(e.target.value); setFormError('') }} />
              </div>
              <div className="w-40">
                <Select label={t('roomsPage.roomType')} id="room-type" value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                  {roomTypes.map((t) => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)}
                </Select>
              </div>
              <div className="w-32">
                <Input label={t('roomsPage.basePrice')} id="base-price" type="number" value={roomPrice} onChange={(e) => setRoomPrice(e.target.value)} />
              </div>
              <Button onClick={onInsertRoom}>{t('roomsPage.addRoomButton')}</Button>
            </div>
            {formError && <p className="text-sm text-red-600 mb-4">{formError}</p>}
          </>
        )}

        {rooms.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden mt-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">{t('roomsPage.roomNumber')}</th>
                  <th className="text-left px-4 py-2.5 font-medium">{t('roomsPage.roomType')}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{t('roomsPage.basePrice')}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{t('roomsPage.operations')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rooms.map((r) => (
                  editingId === r.room_id ? (
                    <tr key={r.room_id} className="bg-primary-50/30">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{r.room_number}</td>
                      <td className="px-4 py-2.5">
                        <Select value={editType} onChange={e => setEditType(e.target.value)}>
                          {roomTypes.map(t => <option key={t.type_id} value={t.type_name}>{t.type_name}</option>)}
                        </Select>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} />
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button onClick={() => { onUpdateRoom(r.room_id, { room_type: editType, base_price: Number(editPrice) }); setEditingId(null) }}
                          className="px-2 py-1 text-xs font-medium bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors">
                          {t('roomsPage.save')}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="ml-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors">
                          {t('roomsPage.cancel')}
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={r.room_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{r.room_number}</td>
                      <td className="px-4 py-2.5 text-gray-600">{r.room_type}</td>
                      <td className="px-4 py-2.5 text-right text-gray-900">¥{r.base_price.toFixed(0)}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button onClick={() => startEdit(r)} className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title={t('common.edit')}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        <button onClick={() => showConfirm({ title: t('common.confirm'), message: t('roomsPage.deleteConfirm', { roomNumber: r.room_number }), onConfirm: () => onDeleteRoom(r.room_id), variant: 'danger' })}
                          className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title={t('common.delete')}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        ) : roomTypes.length > 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm mt-4">{t('roomsPage.noRooms')}</div>
        ) : null}
      </Card>
      {AlertComponent}
      {ConfirmComponent}
    </div>
  )
}
