import { Sparkle } from '@phosphor-icons/react'

import { similarityPercent } from '@/lib/format'

export default function SimilarityBadge({ similarity }: { similarity: number }) {
  return (
    <span className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-[#312e81] to-[#1d4ed8] px-2 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
      <Sparkle size={10} weight="fill" />
      {similarityPercent(similarity)}% giống
    </span>
  )
}
