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
    {
      behavior: 'append',
      properties: {
        className: ['heading-anchor'],
        ariaLabel: 'Link to section',
      },
      content: {
        type: 'element',
        tagName: 'span',
        properties: { 'aria-hidden': 'true' },
        children: [{ type: 'text', value: ' #' }],
      },
    },
  ],
]

const DANGEROUS_URI_RE = /^(javascript|data|vbscript)\s*:/i

function isSafeHref(href: string | undefined): boolean {
  if (!href) return false
  try {
    const url = new URL(href, 'http://localhost')
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)
  } catch {
    return href.startsWith('/') || href.startsWith('#')
  }
}

function isExternalHref(href: string | undefined): boolean {
  if (!href) return false
  try {
    const url = new URL(href)
    return url.origin !== window.location.origin
  } catch {
    return false
  }
}

const MD_COMPONENTS = {
  input: ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} readOnly aria-label="Task item" />
  ),

  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (!isSafeHref(href)) {
      return <span {...props}>{children}</span>
    }

    const isExternal = isExternalHref(href)

    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        {...props}
      >
        {children}
      </a>
    )
  },

 img: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => {
    if (typeof src !== 'string' || DANGEROUS_URI_RE.test(src)) {
      return null
    }

    return (
      <img
        src={src}
        alt={alt ?? ''}
        loading="lazy"
        referrerPolicy="no-referrer"
        {...props}
      />
    )
  },
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