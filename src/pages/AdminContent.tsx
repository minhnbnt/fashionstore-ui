import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { FileText, Image, Megaphone, Question, X } from '@phosphor-icons/react'

import AdminShell from '@/components/admin/AdminShell'

import BannersTab from '../components/admin/BannersTab'
import FaqsTab from '../components/admin/FaqsTab'
import PagesTab from '../components/admin/PagesTab'
import PopupsTab from '../components/admin/PopupsTab'

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
  const [notice, setNotice] = useState<string | null>(null)

  function selectTab(value: TabValue) {
    setNotice(null)
    setSearchParams({ tab: value })
  }

  let panel = <BannersTab onNotice={setNotice} />
  if (tab === 'popups') {
    panel = <PopupsTab onNotice={setNotice} />
  }
  if (tab === 'pages') {
    panel = <PagesTab onNotice={setNotice} />
  }
  if (tab === 'faqs') {
    panel = <FaqsTab onNotice={setNotice} />
  }

  return (
    <AdminShell
      title="Nội dung sàn"
      description="Banner, popup khuyến mãi, trang giới thiệu/chính sách và câu hỏi thường gặp hiển thị cho khách."
    >
      {notice !== null && (
        <output className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
          {notice}
          <button type="button" aria-label="Ẩn thông báo" onClick={() => setNotice(null)}>
            <X size={16} weight="bold" />
          </button>
        </output>
      )}

      <div className="mb-5 flex flex-wrap gap-1.5" role="tablist" aria-label="Loại nội dung">
        {TABS.map(function (item) {
          const selected = item.value === tab
          const TabIcon = item.icon
          let tabClass =
            'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition text-zinc-600 hover:bg-white/70 dark:text-zinc-300 dark:hover:bg-white/10'
          if (selected) {
            tabClass =
              'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition bg-indigo-600 text-white dark:bg-indigo-500'
          }
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => selectTab(item.value)}
              className={tabClass}
            >
              <TabIcon size={16} weight="bold" />
              {item.label}
            </button>
          )
        })}
      </div>
      {panel}
    </AdminShell>
  )
}
