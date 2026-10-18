import { statusMeta } from '@/lib/admin'

export default function StatusBadge({ status }: { status: string | null | undefined }) {
  const meta = statusMeta(status)

  return (
    <span className={'inline-flex rounded-full px-2.5 py-1 text-xs font-bold ' + meta.className}>
      {meta.label}
    </span>
  )
}
