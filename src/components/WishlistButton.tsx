import { useNavigate } from 'react-router'

import { Heart } from '@phosphor-icons/react'

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
  let buttonClass = 'glass absolute top-3 right-3 rounded-full p-2 disabled:opacity-60'
  if (action) {
    size = 16
    buttonClass =
      'flex items-center justify-center rounded-full border border-sky-200 px-4 py-3 transition hover:border-rose-300 disabled:opacity-60 dark:border-white/10 dark:hover:border-rose-400/50'
    if (favorited) {
      buttonClass =
        'flex items-center justify-center rounded-full border border-rose-300 px-4 py-3 transition disabled:opacity-60 dark:border-rose-400/50'
    }
  }

  function toggleFavorite() {
    if (props.productId === undefined || props.productId === '') {
      return
    }
    if (isLoggedIn === false) {
      void navigate('/login', { state: { from: '/product/' + props.productId } })
      return
    }
    toggle.mutate({ data: { productId: props.productId } })
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
