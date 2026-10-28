export interface ShopRoleItem {
  id: string
  name: string
  permissions: string[]
  isSystem: boolean
  memberCount: number
}

export interface ShopMemberItem {
  id: string
  email: string
  displayName: string
  roleId: string
  roleName: string
  status: 'ACTIVE' | 'DEACTIVATED'
  joinedAt: string
}
