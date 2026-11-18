import AccountLayout from '@/components/account/AccountLayout'
import AddressBookTab from '@/components/account/AddressBookTab'
import { cn, PANEL_CLASS } from '@/lib/ui/styles'

export default function Addresses() {
  return (
    <AccountLayout
      breadcrumbs={[
        { label: 'Trang chủ', to: '/' },
        { label: 'Tài khoản', to: '/account' },
        { label: 'Sổ địa chỉ' },
      ]}
    >
      <section className={cn(PANEL_CLASS, 'p-6')}>
        <AddressBookTab />
      </section>
    </AccountLayout>
  )
}
