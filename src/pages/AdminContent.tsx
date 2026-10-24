import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { FileText, Image, Megaphone, Question, SquaresFour, X } from '@phosphor-icons/react'

import AdminNav from '../components/admin/AdminNav'
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
    <main className="mx-auto max-w-[1400px] px-4 pt-[100px] pb-12">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#312e81] via-[#1d4ed8] to-[#38bdf8] shadow-lg">
          <SquaresFour size={22} weight="bold" className="text-white" />
        </div>
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-indigo-600 uppercase dark:text-indigo-400">
            Admin
          </p>
          <h1 className="text-xl font-extrabold tracking-tighter">Nội dung sàn</h1>
        </div>
      </div>

      <AdminNav />

      {notice !== null && (
        <output className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
          {notice}
          <button type="button" aria-label="Ẩn thông báo" onClick={() => setNotice(null)}>
            <X size={16} weight="bold" />
          </button>
        </output>
      )}

      <section className="glass rounded-3xl p-5">
        <div className="mb-5 flex flex-wrap gap-1.5" role="tablist" aria-label="Loại nội dung">
          {TABS.map(function (item) {
            const selected = item.value === tab
            const TabIcon = item.icon
            let tabClass =
              'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition text-zinc-600 hover:bg-white/70 dark:text-zinc-300 dark:hover:bg-white/10'
            if (selected) {
              tabClass =
                'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition bg-indigo-900 text-white dark:bg-indigo-300 dark:text-indigo-950'
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
      </section>
    </main>
  )
}
