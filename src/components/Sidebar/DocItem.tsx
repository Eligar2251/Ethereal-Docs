'use client'

import { memo, useCallback } from 'react'
import { motion, Variants } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import type { DocumentSummary } from '@/types/database'
import styles from './Sidebar.module.css'

interface DocItemProps {
  doc: DocumentSummary
  isActive: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  animationDelay: number
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
      delay,
    },
  }),
}

function DocItemInner({
  doc,
  isActive,
  onSelect,
  onDelete,
  animationDelay,
}: DocItemProps) {
  const handleSelect = useCallback(() => {
    onSelect(doc.id)
  }, [doc.id, onSelect])

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onDelete(doc.id)
    },
    [doc.id, onDelete]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(doc.id)
      }
    },
    [doc.id, onSelect]
  )

  const handleDeleteKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLSpanElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        onDelete(doc.id)
      }
    },
    [doc.id, onDelete]
  )

  const preview = doc.content_preview?.trim()
    ? doc.content_preview.replace(/[#*`>_~[\]]/g, '').trim().slice(0, 60)
    : 'Empty document'

  return (
    <motion.div
      className={styles.docItem}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-current={isActive ? 'true' : undefined}
      aria-label={doc.title || 'Untitled Document'}
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      custom={animationDelay}
      layout
    >
      <div className={styles.docItemContent}>
        <span className={styles.docTitle}>
          {doc.title || 'Untitled Document'}
        </span>
        <span className={styles.docMeta}>
          {formatRelativeDate(doc.updated_at)} · {preview}
        </span>
      </div>

      <div className={styles.docActions}>
        <span
          role="button"
          tabIndex={0}
          className={`${styles.docActionBtn} ${styles.danger}`}
          onClick={handleDelete}
          onKeyDown={handleDeleteKeyDown}
          aria-label={`Delete "${doc.title || 'Untitled Document'}"`}
        >
          <Trash2 size={12} strokeWidth={1.5} />
        </span>
      </div>
    </motion.div>
  )
}

export const DocItem = memo(DocItemInner)
DocItem.displayName = 'DocItem'