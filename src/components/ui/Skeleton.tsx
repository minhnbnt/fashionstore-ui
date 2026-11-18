import { CARD_CLASS, cn } from '@/lib/ui/styles'

export interface SkeletonProps {
  className?: string
}

export function Skeleton(props: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-full bg-zinc-200/70 motion-safe:animate-pulse dark:bg-white/10',
        props.className,
      )}
    />
  )
}

export function ProductCardSkeleton(props: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(CARD_CLASS, 'flex flex-col gap-3 overflow-hidden p-3', props.className)}
    >
      <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
      <div className="space-y-2 px-1 pb-1">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3.5 w-3/5" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-14" />
        </div>
      </div>
    </div>
  )
}

export interface TableRowsSkeletonProps {
  rows?: number
  columns?: number
  className?: string
}

export function TableRowsSkeleton(props: TableRowsSkeletonProps) {
  const rowCount = props.rows ?? 5
  const colCount = props.columns ?? 4
  const rowKeys = Array.from({ length: rowCount }, function (_, idx) {
    return idx
  })
  const colKeys = Array.from({ length: colCount }, function (_, idx) {
    return idx
  })

  return (
    <output aria-label="Đang tải dữ liệu" className={cn('block space-y-3', props.className)}>
      {rowKeys.map(function (rowIndex) {
        return (
          <div key={rowIndex} className={cn(CARD_CLASS, 'flex items-center gap-4 px-5 py-4')}>
            {colKeys.map(function (colIndex) {
              let widthClass = 'flex-1'
              if (colIndex === 0) {
                widthClass = 'w-1/4 shrink-0'
              }
              return <Skeleton key={colIndex} className={cn('h-4', widthClass)} />
            })}
          </div>
        )
      })}
    </output>
  )
}

export function DashboardSkeleton(props: SkeletonProps) {
  return (
    <output
      aria-label="Đang tải bảng điều khiển"
      className={cn('block space-y-5', props.className)}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map(function (idx) {
          return (
            <div key={idx} className={cn(CARD_CLASS, 'space-y-3 p-5')}>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-9 rounded-2xl" />
              </div>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3.5 w-40" />
            </div>
          )
        })}
      </div>
      <div className={cn(CARD_CLASS, 'space-y-4 p-6')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-8 w-56" />
        </div>
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map(function (idx) {
          return (
            <div key={idx} className={cn(CARD_CLASS, 'space-y-3 p-5')}>
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          )
        })}
      </div>
    </output>
  )
}

export function DetailSkeleton(props: SkeletonProps) {
  return (
    <output aria-label="Đang tải chi tiết" className={cn('block space-y-5', props.className)}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="aspect-[4/5] w-full rounded-3xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </output>
  )
}

export function PageSkeleton(props: SkeletonProps) {
  const cardIndices = [0, 1, 2, 3, 4, 5, 6, 7]

  return (
    <output
      aria-label="Đang tải trang"
      className={cn('mx-auto block max-w-7xl space-y-6 px-4 py-8 sm:px-6', props.className)}
    >
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cardIndices.map(function (idx) {
          return <ProductCardSkeleton key={idx} />
        })}
      </div>
    </output>
  )
}

export default Skeleton
