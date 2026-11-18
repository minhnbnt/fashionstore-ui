import { useNavigate } from 'react-router'

import { Heart } from '@phosphor-icons/react'

import { takeData } from '@/lib/api/apiAdapters'
import { notify } from '@/lib/notifications'

import { useWishlist } from '../hooks/useWishlist'

export default function WishlistButton(props: {
  productId: string | undefined
  variant?: 'icon' | 'action'
}) {
  const { isLoggedIn, isFavorited, toggle } = useWishlist()
  const navigate = useNavigate()
  const favorited = isFavorited(props.productId)
  const action = props.variant === 'action'

  let weight: 'fill' | 'regular' = 'regular'
  let iconClass = ''
  let ariaLabel = 'Thêm vào yêu thích'
  if (favorited) {
    weight = 'fill'
    iconClass = 'text-rose-500'
    ariaLabel = 'Bỏ khỏi yêu thích'
  }

  let size = 18
  let buttonClass =
    'glass absolute top-3 right-3 cursor-pointer rounded-full p-2 disabled:cursor-not-allowed disabled:opacity-60'
  if (action) {
    size = 16
    buttonClass =
      'flex cursor-pointer items-center justify-center rounded-full border border-sky-200 px-4 py-3 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:hover:border-rose-400/50'
    if (favorited) {
      buttonClass =
        'flex cursor-pointer items-center justify-center rounded-full border border-rose-300 px-4 py-3 transition disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-400/50'
    }
  }

  function toggleFavorite() {
    if (props.productId === undefined || props.productId === '') {
      return
    }
    const productId = props.productId
    if (isLoggedIn === false) {
      notify.info('Vui lòng đăng nhập để lưu sản phẩm yêu thích', undefined, {
        id: 'wishlist-auth',
      })
      void navigate('/login', { state: { from: '/product/' + productId } })
      return
    }
    const wasFavorited = favorited
    toggle.mutate(
      { data: { productId } },
      {
        onSuccess: function (res) {
          let saved = wasFavorited === false
          try {
            const data = takeData(res)
            if (data.saved !== undefined) {
              saved = data.saved
            }
          } catch {
            // Fallback to toggled local expectation when payload is absent
          }
          if (saved) {
            notify.success('Đã thêm vào yêu thích', undefined, {
              id: 'wishlist-' + productId,
            })
            return
          }
          notify.info('Đã bỏ khỏi yêu thích', undefined, {
            id: 'wishlist-' + productId,
          })
        },
        onError: function (err) {
          notify.fromError(err, 'wishlist', 'Không thể cập nhật danh sách yêu thích', {
            id: 'wishlist-' + productId,
          })
        },
      },
    )
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={favorited}
      disabled={toggle.isPending}
      onClick={toggleFavorite}
      className={buttonClass}
    >
      <Heart size={size} weight={weight} className={iconClass} />
    </button>
  )
}
