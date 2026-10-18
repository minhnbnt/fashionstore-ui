import { NavLink } from 'react-router'

import { ChartBar, Package, ShieldCheck, Storefront, Users } from '@phosphor-icons/react'

const NAV_ITEMS = [
  { to: '/admin', label: 'Tổng quan', icon: ChartBar, end: true },
  { to: '/admin/shops', label: 'Shop', icon: Storefront, end: false },
  { to: '/admin/users', label: 'Tài khoản', icon: Users, end: false },
  { to: '/admin/products', label: 'Sản phẩm', icon: Package, end: false },
]

function navClass(active: boolean): string {
  const base = 'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition'
  if (active) {
    return (
      base +
      ' bg-indigo-900 text-white shadow-lg shadow-indigo-900/20 dark:bg-indigo-300 dark:text-indigo-950'
    )
  }
  return base + ' text-zinc-600 hover:bg-sky-100 dark:text-zinc-300 dark:hover:bg-white/10'
}

export default function AdminShell(props: {
  title: string
  description: string
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-[100px] pb-12">
      <section className="glass overflow-hidden rounded-3xl">
        <div className="border-b border-zinc-200/70 px-5 py-5 md:px-7 dark:border-white/10">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-900 text-white shadow-lg shadow-indigo-900/20 dark:bg-indigo-300 dark:text-indigo-950">
                <ShieldCheck size={23} weight="bold" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-indigo-700 uppercase dark:text-indigo-200">
                  Vận hành hệ thống
                </p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tighter md:text-3xl">
                  {props.title}
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
                  {props.description}
                </p>
              </div>
            </div>
            {props.actions}
          </div>

          <nav aria-label="Điều hướng quản trị" className="mt-5 flex flex-wrap gap-2">
            {NAV_ITEMS.map(function (item) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={function ({ isActive }) {
                    return navClass(isActive)
                  }}
                >
                  <item.icon size={17} weight="bold" />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        </div>

        <div className="p-5 md:p-7">{props.children}</div>
      </section>
    </main>
  )
}
