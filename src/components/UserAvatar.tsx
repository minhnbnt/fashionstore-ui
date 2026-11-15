import Avatar from 'boring-avatars'

export default function UserAvatar(props: { name: string; size?: number; src?: string }) {
  const size = props.size ?? 40
  const src = props.src ?? ''

  if (src !== '') {
    return (
      <span
        className="inline-block shrink-0 overflow-hidden rounded-full"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <img src={src} alt="" className="h-full w-full object-cover" />
      </span>
    )
  }

  return (
    <span
      className="inline-block shrink-0 overflow-hidden rounded-full"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Avatar
        name={props.name}
        variant="marble"
        size={size}
        colors={['#312e81', '#1d4ed8', '#38bdf8', '#a5b4fc']}
      />
    </span>
  )
}
