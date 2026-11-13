import { WarningCircle } from '@phosphor-icons/react'

export default function StatePanel(props: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="glass rounded-3xl px-5 py-10 text-center">
      <WarningCircle className="mx-auto text-blue-700 dark:text-sky-300" size={30} />
      <p className="mt-3 font-extrabold tracking-tight">{props.title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-zinc-600 dark:text-zinc-300">
        {props.description}
      </p>
      {props.action}
    </div>
  )
}
