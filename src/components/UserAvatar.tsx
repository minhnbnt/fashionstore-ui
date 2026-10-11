import Avatar from 'boring-avatars'

export default function UserAvatar(props: { name: string; size?: number }) {
  const size = props.size ?? 40
  return (
    <span
      className="inline-block shrink-0 overflow-hidden rounded-full"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Avatar name={props.name} variant="marble" size={size} />
    </span>
  )
}
