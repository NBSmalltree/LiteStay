export interface RoomType {
  type_id: number
  type_name: string
  sort_order: number
}

export interface Room {
  room_id: number
  room_number: string
  room_type: string
  base_price: number
}
