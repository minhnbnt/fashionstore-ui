import type { ReactNode } from 'react'

import { List } from '@phosphor-icons/react'

import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Drawer } from '@/components/ui/Drawer'
import { cn, FOCUS_RING_CLASS, WORKSPACE_PANEL_CLASS } from '@/lib/ui/styles'

import type { BreadcrumbItem } from '@/components/ui/Breadcrumb'

export interface WorkspaceShellProps {
  brandSlot: ReactNode
  topbarActions: ReactNode
  sidebarContent: ReactNode
  mobileDrawerTitle: string
  mobileDrawerContent: ReactNode
  mobileMenuOpen: boolean
  onOpenMobileMenu: () => void
  onCloseMobileMenu: () => void
  mobileMenuAriaLabel: string
  breadcrumbs?: BreadcrumbItem[]
  pageTitle?: string
  pageDescription?: string
  pageActions?: ReactNode
  children: ReactNode
}

export function WorkspaceShell({
  brandSlot,
  topbarActions,
  sidebarContent,
  mobileDrawerTitle,
  mobileDrawerContent,
  mobileMenuOpen,
  onOpenMobileMenu,
  onCloseMobileMenu,
  mobileMenuAriaLabel,
  breadcrumbs,
  pageTitle,
  pageDescription,
  pageActions,
  children,
}: WorkspaceShellProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col font-sans">
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-full focus:bg-blue-700 focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white focus:shadow-lg"
      >
        Chuyển đến nội dung chính
      </a>

      {/* Topbar nổi dạng glass pill đồng nhất giữa Admin & Shop */}
      <header className="sticky top-0 z-40">
        <div className="mx-auto max-w-[1600px] px-4">
          <div className="glass mt-3 flex h-16 items-center justify-between gap-2.5 rounded-full px-3.5 md:gap-4 md:px-6">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                aria-label={mobileMenuAriaLabel}
                onClick={onOpenMobileMenu}
                className={cn(
                  'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-700 transition hover:bg-sky-100 hover:text-[#17203a] lg:hidden dark:text-zinc-200 dark:hover:bg-white/10 dark:hover:text-white',
                  FOCUS_RING_CLASS,
                )}
              >
                <List size={21} weight="bold" />
              </button>
              {brandSlot}
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-2.5">
              {topbarActions}
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-5 px-4 py-5">
        <aside className="sticky top-24 hidden max-h-[calc(100dvh-112px)] w-64 shrink-0 flex-col overflow-y-auto rounded-3xl border border-zinc-200/90 bg-white/95 p-4 shadow-sm lg:flex dark:border-white/10 dark:bg-[#11182a]">
          {sidebarContent}
        </aside>

        <Drawer
          open={mobileMenuOpen}
          side="left"
          title={mobileDrawerTitle}
          widthClass="max-w-xs"
          onClose={onCloseMobileMenu}
        >
          {mobileDrawerContent}
        </Drawer>

        <main id="workspace-main" className="min-w-0 flex-1 space-y-5 pb-10">
          {breadcrumbs !== undefined && breadcrumbs.length > 0 && (
            <div className="rounded-2xl border border-zinc-200/90 bg-white/95 px-4 py-2.5 shadow-xs dark:border-white/10 dark:bg-[#11182a]">
              <Breadcrumb items={breadcrumbs} showHomeIcon />
            </div>
          )}

          {pageTitle !== undefined && (
            <section className={WORKSPACE_PANEL_CLASS}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <h1 className="text-2xl font-extrabold tracking-tight text-[#17203a] md:text-3xl dark:text-[#e2e8f0]">
                    {pageTitle}
                  </h1>
                  {pageDescription !== undefined && pageDescription !== '' && (
                    <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
                      {pageDescription}
                    </p>
                  )}
                </div>
                {pageActions !== undefined && (
                  <div className="flex shrink-0 flex-wrap items-center gap-2.5">{pageActions}</div>
                )}
              </div>
            </section>
          )}

          <div>{children}</div>
        </main>
      </div>
    </div>
  )
}

export default WorkspaceShell
