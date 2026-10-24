import { statusMeta } from '@/lib/admin'

import type { StatusMeta } from '@/types/admin'

// Badge trạng thái dùng chung admin + seller. Mặc định tra bảng statusMeta của admin;
// seller truyền riêng sellerStatusMeta (lib/sellerStatus) vì cùng mã nhưng khác nhãn.
export default function StatusBadge(props: {
  status: string | null | undefined
  meta?: (status: string | null | undefined) => StatusMeta
}) {
  const lookup = props.meta ?? statusMeta
  const meta = lookup(props.status)

  return (
    <span className={'inline-flex rounded-full px-2.5 py-1 text-xs font-bold ' + meta.className}>
      {meta.label}
    </span>
  )
}
