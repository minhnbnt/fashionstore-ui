export type CustomerOrderStatusTab =
  | 'ALL'
  | 'PENDING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'

export interface OrderStatusConfig {
  label: string
  colorClass: string
}
