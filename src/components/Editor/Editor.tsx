'use client'

import { memo, useEffect, useRef, useMemo } from 'react'
import { useCodeMirror } from './useCodeMirror'
import styles from './Editor.module.css'

interface EditorProps {
  content: string
  onChange: (value: string) => void
  disabled?: boolean
}

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

function countChars(text: string): number {
  return text.length
}

function formatCount(n: number, unit: string): string {
  return `${n.toLocaleString()} ${unit}${n !== 1 ? 's' : ''}`
}

function EditorInner({ content, onChange, disabled = false }: EditorProps) {
  const { containerRef, setContent } = useCodeMirror({
    initialValue: content,
    onChange,
    disabled,
  })

  const prevContentRef = useRef(content)
  useEffect(() => {
    if (prevContentRef.current !== content) {
      setContent(content)
      prevContentRef.current = content
    }
  }, [content, setContent])

  const wordCount = useMemo(() => countWords(content), [content])
  const charCount = useMemo(() => countChars(content), [content])
  const readingTime = useMemo(() => {
    const minutes = Math.ceil(wordCount / 200)
    return minutes < 1 ? '< 1 min read' : `${minutes} min read`
  }, [wordCount])

  return (
    <div className={styles.root}>
      <div className={styles.cmHost} ref={containerRef} />
      <footer className={styles.footer} aria-label="Document statistics">
        <span className={styles.footerStat}>{formatCount(wordCount, 'word')}</span>
        <span className={styles.footerDot} aria-hidden="true" />
        <span className={styles.footerStat}>{formatCount(charCount, 'char')}</span>
        <span className={styles.footerDot} aria-hidden="true" />
        <span className={styles.footerStat}>{readingTime}</span>
      </footer>
    </div>
  )
}

export const Editor = memo(EditorInner)
Editor.displayName = 'Editor'