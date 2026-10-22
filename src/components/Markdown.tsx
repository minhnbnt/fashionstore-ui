import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import { Link } from 'react-router'

import { isInternalLink } from '@/lib/siteContent'

// react-markdown không render HTML thô và tự lọc URL nguy hiểm (javascript:...),
// nên nội dung admin soạn không thành XSS.
const COMPONENTS: Components = {
  h1: ({ children }) => (
    <h1 className="mt-8 mb-4 text-3xl font-extrabold tracking-tighter first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-8 mb-3 text-xl font-extrabold tracking-tight first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => <h3 className="mt-6 mb-2 text-base font-bold first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-6">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-bold text-zinc-900 dark:text-white">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-indigo-300 pl-4 text-zinc-600 dark:border-indigo-500/50 dark:text-zinc-300">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-zinc-200 dark:border-white/10" />,
  code: ({ children }) => (
    <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-white/10">{children}</code>
  ),
  a: ({ href, children }) => {
    const target = href ?? ''
    const linkClass =
      'font-semibold text-indigo-600 underline underline-offset-2 hover:text-indigo-800 dark:text-indigo-300'
    if (isInternalLink(target)) {
      return (
        <Link to={target} className={linkClass}>
          {children}
        </Link>
      )
    }
    return (
      <a href={target} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {children}
      </a>
    )
  },
}

export default function Markdown({ source }: { source: string }) {
  return (
    <div className="text-[15px] text-zinc-700 dark:text-zinc-300">
      <ReactMarkdown components={COMPONENTS}>{source}</ReactMarkdown>
    </div>
  )
}
