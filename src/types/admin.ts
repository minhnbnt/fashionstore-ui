export interface StatusMeta {
  label: string
  className: string
}

export interface BreakdownInput {
  label: string
  value: number
}

export interface BreakdownRow extends BreakdownInput {
  share: number
}

export type TrendMetric = 'orders' | 'orderValue' | 'newUsers' | 'newShops'

export interface TrendPoint {
  date: string
  value: number
}

export type ConfirmAction = 'approve' | 'reinstate'

export type ReasonAction = 'reject' | 'suspend'
