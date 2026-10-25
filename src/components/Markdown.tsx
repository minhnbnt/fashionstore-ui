import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import { Link } from 'react-router'

import { isInternalLink } from '@/lib/siteContent'

// react-markdown không render HTML thô và tự lọc URL nguy hiểm (javascript:...),
// nên nội dung admin soạn không thành XSS.
// Style typography do @tailwindcss/typography (prose) đảm nhiệm, chỉ override link
// để giữ link nội bộ đi qua react-router và đúng màu chàm của design system.
const COMPONENTS: Components = {
  a: ({ href, children }) => {
    const target = href ?? ''
    if (isInternalLink(target)) {
      return <Link to={target}>{children}</Link>
    }
    return (
      <a href={target} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  },
}

export default function Markdown({ source }: { source: string }) {
  return (
    <article className="prose prose-zinc dark:prose-invert prose-a:font-semibold prose-a:text-indigo-600 prose-a:underline-offset-2 dark:prose-a:text-indigo-300 max-w-none">
      <ReactMarkdown components={COMPONENTS}>{source}</ReactMarkdown>
    </article>
  )
}
