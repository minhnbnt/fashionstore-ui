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
