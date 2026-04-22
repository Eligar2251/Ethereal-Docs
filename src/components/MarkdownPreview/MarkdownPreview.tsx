'use client'

import React, { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { FileText } from 'lucide-react'
import styles from './MarkdownPreview.module.css'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

const REMARK_PLUGINS = [remarkGfm]

const REHYPE_PLUGINS = [
  rehypeSlug,
  [
    rehypeAutolinkHeadings,
    { behavior: 'wrap', properties: { className: ['heading-anchor'] } },
  ],
]

const MD_COMPONENTS = {
  input: ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} readOnly aria-label="Task item" />
  ),
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      {...props}
    >
      {children}
    </a>
  ),
  img: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ''} loading="lazy" {...props} />
  ),
}

function MarkdownPreviewInner({ content, className }: MarkdownPreviewProps) {
  const trimmed = content.trim()

  if (!trimmed) {
    return (
      <div className={`${styles.root} ${className ?? ''}`}>
        <div className={styles.empty}>
          <FileText size={40} strokeWidth={1} className={styles.emptyIcon} />
          <p className={styles.emptyText}>Start writing to see your document here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.root} ${className ?? ''}`}>
      <div className={styles.prose}>
        <ReactMarkdown
          remarkPlugins={REMARK_PLUGINS as never}
          rehypePlugins={REHYPE_PLUGINS as never}
          components={MD_COMPONENTS as never}
        >
          {trimmed}
        </ReactMarkdown>
      </div>
    </div>
  )
}

export const MarkdownPreview = memo(MarkdownPreviewInner)
MarkdownPreview.displayName = 'MarkdownPreview'