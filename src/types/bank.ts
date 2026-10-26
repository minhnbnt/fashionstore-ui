export interface BankResponse {
  id: string
  name: string
  code: string
  bin: string
  shortName: string
  logo?: string | null
  lookupSupported: boolean
}

export interface LookupAccountRequest {
  bin: string
  accountNumber: string
}

export interface LookupAccountResponse {
  bankCode: string
  accountNumber: string
  accountName: string
}
