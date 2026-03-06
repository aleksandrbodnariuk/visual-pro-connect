
export type OrderType = 'photo' | 'video' | 'music' | 'other';
export type OrderStatus = 'pending' | 'confirmed' | 'archived';

export interface SpecialistOrder {
  id: string;
  title: string;
  description: string | null;
  order_type: OrderType;
  order_date: string;
  status: OrderStatus;
  price: number | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrderParticipant {
  id: string;
  order_id: string;
  specialist_id: string;
  role: string;
  created_at: string;
}

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  photo: 'Фото',
  video: 'Відео',
  music: 'Музика',
  other: 'Інше',
};

export const ORDER_TYPE_COLORS: Record<OrderType, string> = {
  photo: 'bg-blue-500',
  video: 'bg-red-500',
  music: 'bg-green-500',
  other: 'bg-gray-500',
};

export const ORDER_TYPE_TEXT_COLORS: Record<OrderType, string> = {
  photo: 'text-blue-600 dark:text-blue-400',
  video: 'text-red-600 dark:text-red-400',
  music: 'text-green-600 dark:text-green-400',
  other: 'text-muted-foreground',
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Очікує',
  confirmed: 'Підтверджено',
  archived: 'Архів',
};
