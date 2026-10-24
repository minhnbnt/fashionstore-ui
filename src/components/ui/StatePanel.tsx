import { WarningCircle } from '@phosphor-icons/react'

export default function StatePanel(props: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white/70 px-5 py-10 text-center dark:border-white/10 dark:bg-white/5">
      <WarningCircle className="mx-auto text-indigo-600 dark:text-indigo-300" size={30} />
      <p className="mt-3 font-extrabold tracking-tight">{props.title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-zinc-600 dark:text-zinc-300">
        {props.description}
      </p>
      {props.action}
    </div>
  )
}
