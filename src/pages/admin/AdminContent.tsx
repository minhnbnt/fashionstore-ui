import { useSearchParams } from 'react-router'

import { FileText, Image, Megaphone, Question } from '@phosphor-icons/react'

import AdminShell from '@/components/admin/AdminShell'
import BannersTab from '@/components/admin/tabs/BannersTab'
import FaqsTab from '@/components/admin/tabs/FaqsTab'
import PagesTab from '@/components/admin/tabs/PagesTab'
import PopupsTab from '@/components/admin/tabs/PopupsTab'
import { notify } from '@/lib/notifications'
import { cn, PANEL_CLASS, segmentedItemClass, segmentedTrackClass } from '@/lib/ui/styles'

const TABS = [
  { value: 'banners', label: 'Banner', icon: Image },
  { value: 'popups', label: 'Popup', icon: Megaphone },
  { value: 'pages', label: 'Trang tĩnh', icon: FileText },
  { value: 'faqs', label: 'FAQ', icon: Question },
] as const

type TabValue = (typeof TABS)[number]['value']

function tabFromUrl(raw: string | null): TabValue {
  const match = TABS.find((tab) => tab.value === raw)
  if (match === undefined) {
    return 'banners'
  }
  return match.value
}

export default function AdminContent() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = tabFromUrl(searchParams.get('tab'))

  function selectTab(value: TabValue) {
    setSearchParams({ tab: value })
  }

  function handleNotice(message: string) {
    notify.success(message)
  }

  let panel = <BannersTab onNotice={handleNotice} />
  if (tab === 'popups') {
    panel = <PopupsTab onNotice={handleNotice} />
  }
  if (tab === 'pages') {
    panel = <PagesTab onNotice={handleNotice} />
  }
  if (tab === 'faqs') {
    panel = <FaqsTab onNotice={handleNotice} />
  }

  return (
    <AdminShell
      title="Nội dung sàn"
      description="Quản lý banner, popup khuyến mãi, trang tĩnh và câu hỏi thường gặp của DHMQ."
    >
      <section className={PANEL_CLASS}>
        <div
          className={cn(segmentedTrackClass(), 'mb-5 w-fit flex-wrap')}
          role="tablist"
          aria-label="Loại nội dung"
        >
          {TABS.map(function (item) {
            const selected = item.value === tab
            const TabIcon = item.icon
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => selectTab(item.value)}
                className={cn(segmentedItemClass(selected), 'cursor-pointer px-4 py-2 text-sm')}
              >
                <TabIcon size={16} weight="bold" />
                {item.label}
              </button>
            )
          })}
        </div>
        {panel}
      </section>
    </AdminShell>
  )
}
