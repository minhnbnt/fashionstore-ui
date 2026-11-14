import { reviewOrderProductKey } from './reviewConstants'

import type { OrderItemResponse } from '@generated/model/orderItemResponse'
import type { OrderResponse } from '@generated/model/orderResponse'
import type { ReviewResponse } from '@generated/model/reviewResponse'

export interface GroupedReviewProduct {
  item: OrderItemResponse
  variantLabel?: string
}

export interface OrderReviewLookup {
  byOrderProduct: Map<string, ReviewResponse>
  legacyByProduct: Map<string, ReviewResponse>
}

export function buildOrderReviewLookup(reviews: ReviewResponse[]): OrderReviewLookup {
  const byOrderProduct = new Map<string, ReviewResponse>()
  const legacyByProduct = new Map<string, ReviewResponse>()

  for (const review of reviews) {
    if (!review.productId) {
      continue
    }
    if (review.orderId) {
      byOrderProduct.set(reviewOrderProductKey(review.orderId, review.productId), review)
    } else if (!legacyByProduct.has(review.productId)) {
      legacyByProduct.set(review.productId, review)
    }
  }

  return { byOrderProduct, legacyByProduct }
}

export function findOrderProductReview(
  orderId: string | undefined,
  productId: string | undefined,
  lookup: OrderReviewLookup,
): ReviewResponse | undefined {
  if (!productId) {
    return undefined
  }
  if (orderId) {
    const exact = lookup.byOrderProduct.get(reviewOrderProductKey(orderId, productId))
    if (exact !== undefined) {
      return exact
    }
  }
  return lookup.legacyByProduct.get(productId)
}

/**
 * Gom các sản phẩm khác nhau trong một đơn hàng; nếu cùng productId mua nhiều số lượng
 * hoặc nhiều phân loại/size khác nhau thì giữ 1 mục duy nhất và nối các variantLabel không trùng.
 */
export function groupOrderReviewProducts(
  items: OrderItemResponse[] | undefined,
): GroupedReviewProduct[] {
  const result: GroupedReviewProduct[] = []
  const byProductId = new Map<
    string,
    { index: number; labels: string[]; seenLabels: Set<string> }
  >()

  for (const item of items ?? []) {
    if (!item.productId) {
      result.push({ item, variantLabel: item.variantLabel ?? undefined })
      continue
    }
    const label = (item.variantLabel ?? '').trim()
    const existing = byProductId.get(item.productId)
    if (existing === undefined) {
      const labels: string[] = []
      const seenLabels = new Set<string>()
      if (label !== '') {
        labels.push(label)
        seenLabels.add(label)
      }
      const index = result.length
      let initialVariant: string | undefined
      if (labels.length > 0) {
        initialVariant = labels.join(', ')
      }
      result.push({
        item,
        variantLabel: initialVariant,
      })
      byProductId.set(item.productId, { index, labels, seenLabels })
    } else if (label !== '' && !existing.seenLabels.has(label)) {
      existing.seenLabels.add(label)
      existing.labels.push(label)
      result[existing.index] = {
        item: result[existing.index].item,
        variantLabel: existing.labels.join(', '),
      }
    }
  }

  return result
}

export function resolveOrderReviewAction(
  order: OrderResponse,
  lookup: OrderReviewLookup,
): { visible: boolean; label: string; disabled: boolean } {
  if (order.status !== 'DELIVERED' || !order.receivedAt) {
    return { visible: false, label: '', disabled: true }
  }
  const grouped = groupOrderReviewProducts(order.items)
  if (grouped.length === 0) {
    return { visible: false, label: '', disabled: true }
  }

  let hasUnreviewed = false
  let hasEditable = false
  for (const entry of grouped) {
    const productId = entry.item.productId
    if (!productId) {
      continue
    }
    const existing = findOrderProductReview(order.id, productId, lookup)
    if (existing === undefined) {
      hasUnreviewed = true
    } else if (!existing.edited) {
      hasEditable = true
    }
  }

  if (hasUnreviewed) {
    return { visible: true, label: 'Đánh giá', disabled: false }
  }
  if (hasEditable) {
    return { visible: true, label: 'Sửa đánh giá (1 lần)', disabled: false }
  }
  return { visible: true, label: 'Đã đánh giá', disabled: true }
}
