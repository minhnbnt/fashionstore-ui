import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

import { ArrowClockwise, House, WarningCircle } from '@phosphor-icons/react'

import { cn, iconChipClass, primaryButtonClass, secondaryButtonClass } from '@/lib/ui/styles'

export interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Khong de lo chi tiet ky thuat ra UI nguoi dung.
  }

  handleReload = (): void => {
    if (this.props.onReset !== undefined) {
      this.setState({ hasError: false })
      this.props.onReset()
      return
    }
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  override render(): ReactNode {
    if (this.state.hasError === false) {
      return this.props.children
    }

    if (this.props.fallback !== undefined) {
      return this.props.fallback
    }

    return (
      <div className="flex min-h-[60dvh] items-center justify-center px-4 py-12">
        <div className="glass flex w-full max-w-md flex-col items-center rounded-3xl px-6 py-10 text-center">
          <div
            className={cn(
              iconChipClass(),
              'h-14 w-14 rounded-2xl bg-rose-50 bg-none text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
            )}
          >
            <WarningCircle size={28} weight="fill" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold tracking-tight text-[#17203a] dark:text-[#e2e8f0]">
            Đã có lỗi hiển thị xảy ra
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Trang gặp sự cố ngoài ý muốn. Bạn có thể tải lại trang hoặc quay về trang chủ DHMQ.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className={cn(
                primaryButtonClass(),
                'inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold',
              )}
            >
              <ArrowClockwise size={16} weight="bold" />
              <span>Tải lại trang</span>
            </button>
            <a href="/" className={cn(secondaryButtonClass(), 'px-5 py-2.5')}>
              <House size={16} weight="bold" />
              <span>Về trang chủ</span>
            </a>
          </div>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
