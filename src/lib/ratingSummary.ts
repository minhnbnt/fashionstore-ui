import type { ReviewResponse } from '@generated/model/reviewResponse'

export interface RatingSummary {
  /** Diem trung binh, null khi chua co review nao */
  value: number | null
  count: number
  /** Phan tram theo muc sao, tu 5 sao (index 0) den 1 sao (index 4) */
  breakdown: number[]
}

export function ratingSummary(reviews: ReviewResponse[]): RatingSummary {
  const count = reviews.length
  if (count === 0) {
    return { value: null, count: 0, breakdown: [0, 0, 0, 0, 0] }
  }

  let sum = 0
  const starCounts = [0, 0, 0, 0, 0]
  for (const review of reviews) {
    const stars = review.stars ?? 0
    sum += stars
    if (stars >= 1 && stars <= 5) {
      starCounts[5 - stars] += 1
    }
  }

  const breakdown = starCounts.map(function (n) {
    return Math.round((n / count) * 100)
  })

  return { value: sum / count, count, breakdown }
}
