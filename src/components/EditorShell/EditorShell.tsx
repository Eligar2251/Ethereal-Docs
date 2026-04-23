'use client'

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  memo,
  useDeferredValue,
} from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Toolbar } from '@/components/Toolbar/Toolbar'
import { ThemeProvider } from '@/components/ThemeProvider/ThemeProvider'
import { useFocusMode } from '@/hooks/useFocusMode'
import { createClient } from '@/lib/supabase/client'
import type { Document, EditorMode, DocumentSettings } from '@/types/database'
import type { SaveState } from '@/components/SaveIndicator/SaveIndicator'
import styles from './EditorShell.module.css'

const Editor = dynamic(
  () => import('@/components/Editor/Editor').then(m => ({ default: m.Editor })),
  { ssr: false }
)
const MarkdownPreview = dynamic(
  () =>
    import('@/components/MarkdownPreview/MarkdownPreview').then(m => ({
      default: m.MarkdownPreview,
    })),
  { ssr: false }
)
const SettingsPanel = dynamic(
  () =>
    import('@/components/SettingsPanel/SettingsPanel').then(m => ({
      default: m.SettingsPanel,
    })),
  { ssr: false }
)

// ── Константы ────────────────────────────────────────────────
const AUTOSAVE_DELAY = 2000

// ── ИСПРАВЛЕНО: ограничения на размер данных ─────────────────
const MAX_CONTENT_SIZE = 500_000  // 500KB — более чем достаточно
const MAX_TITLE_LENGTH = 200      // символов

// ── Утилиты санитизации ──────────────────────────────────────

/**
 * Санитизирует заголовок документа:
 * - обрезает до MAX_TITLE_LENGTH символов
 * - убирает HTML-опасные символы
 */
function sanitizeTitle(raw: string): string {
  return raw
    .slice(0, MAX_TITLE_LENGTH)
    .replace(/[<>"]/g, '')
}

// ── Autosave hook ────────────────────────────────────────────
function useAutosave(
  documentId: string,
  onStateChange: (s: SaveState) => void
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const save = useCallback(
    async (
      id: string,
      title: string,
      content: string,
      s: DocumentSettings
    ) => {
      if (!mountedRef.current) return

      // ── ИСПРАВЛЕНО: проверка размера контента ────────────────
      if (content.length > MAX_CONTENT_SIZE) {
        if (mountedRef.current) onStateChange('error')
        console.error(
          '[Autosave] Content too large:',
          content.length,
          'chars (max:',
          MAX_CONTENT_SIZE,
          ')'
        )
        return
      }

      onStateChange('saving')

      const supabase = createClient()

      // Проверяем авторизацию перед сохранением
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        if (mountedRef.current) onStateChange('error')
        console.error('[Autosave] No authenticated user')
        return
      }

      const { error } = await supabase
        .from('documents')
        .update({
          title,
          content,
          settings: s,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id) // защита: только свои документы

      if (!mountedRef.current) return

      onStateChange(error ? 'error' : 'saved')

      if (!error) {
        setTimeout(() => {
          if (mountedRef.current) onStateChange('idle')
        }, 2000)
      } else {
        console.error('[Autosave] Failed:', error.message)
      }
    },
    [onStateChange]
  )

  const scheduleSave = useCallback(
    (id: string, title: string, content: string, s: DocumentSettings) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(
        () => save(id, title, content, s),
        AUTOSAVE_DELAY
      )
    },
    [save]
  )

  return { scheduleSave }
}

// ── Framer Motion variants ────────────────────────────────────
const paneVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

// ── Props ─────────────────────────────────────────────────────
interface EditorShellProps {
  document: Document
  onDocumentUpdate?: (doc: Partial<Document>) => void
}

// ── Component ─────────────────────────────────────────────────
function EditorShellInner({
  document: initialDoc,
  onDocumentUpdate,
}: EditorShellProps) {
  const [title, setTitle] = useState(initialDoc.title)
  const [content, setContent] = useState(initialDoc.content)
  const [settings, setSettings] = useState<DocumentSettings>(initialDoc.settings)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const deferredContent = useDeferredValue(content)
  const { scheduleSave } = useAutosave(initialDoc.id, setSaveState)

  const { isFocused, containerProps } = useFocusMode({
    enabled: settings.focusMode,
    idleDelay: 1500,
  })

  // ── ИСПРАВЛЕНО: санитизация content при изменении ────────────
  const handleContentChange = useCallback(
    (val: string) => {
      // Не принимаем контент больше лимита
      if (val.length > MAX_CONTENT_SIZE) {
        console.warn('[Editor] Content exceeds size limit, truncating')
        return
      }
      setContent(val)
      scheduleSave(initialDoc.id, title, val, settings)
    },
    [initialDoc.id, title, settings, scheduleSave]
  )

  // ── ИСПРАВЛЕНО: санитизация title при изменении ──────────────
  const handleTitleChange = useCallback(
    (val: string) => {
      const sanitized = sanitizeTitle(val)
      setTitle(sanitized)
      onDocumentUpdate?.({ title: sanitized })
      scheduleSave(initialDoc.id, sanitized, content, settings)
    },
    [initialDoc.id, content, settings, scheduleSave, onDocumentUpdate]
  )

  const handleModeChange = useCallback(
    (mode: EditorMode) => {
      const next = { ...settings, editorMode: mode }
      setSettings(next)
      scheduleSave(initialDoc.id, title, content, next)
    },
    [initialDoc.id, title, content, settings, scheduleSave]
  )

  const handleSettingsChange = useCallback((next: DocumentSettings) => {
    setSettings(next)
  }, [])

  const handleToggleSidebar = useCallback(() => setSidebarOpen(p => !p), [])
  const handleOpenSettings = useCallback(() => setSettingsOpen(true), [])
  const handleCloseSettings = useCallback(() => setSettingsOpen(false), [])

  const editorMode = settings.editorMode
  const rootClassName = `${styles.root} ${isFocused ? styles.focusActive : ''}`.trim()

  return (
    <ThemeProvider theme={settings.theme} font={settings.font}>
      <div className={rootClassName} {...containerProps}>
        <div
          className={`${styles.focusVignette} ${
            isFocused ? styles.focusVignetteActive : ''
          }`}
          aria-hidden="true"
        />

        <div className={styles.toolbarTarget}>
          <Toolbar
            title={title}
            onTitleChange={handleTitleChange}
            editorMode={editorMode}
            onEditorModeChange={handleModeChange}
            saveState={saveState}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={handleToggleSidebar}
            onOpenSettings={handleOpenSettings}
            content={content}
          />
        </div>

        <div className={styles.paneArea}>
          <AnimatePresence mode="wait">
            {editorMode === 'write' && (
              <motion.div
                key="write"
                className={styles.paneWrite}
                variants={paneVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Editor content={content} onChange={handleContentChange} />
              </motion.div>
            )}
            {editorMode === 'preview' && (
              <motion.div
                key="preview"
                className={styles.panePreview}
                variants={paneVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <MarkdownPreview content={deferredContent} />
              </motion.div>
            )}
            {editorMode === 'split' && (
              <motion.div
                key="split"
                className={styles.splitContainer}
                variants={paneVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className={styles.paneSplitEditor}>
                  <Editor content={content} onChange={handleContentChange} />
                </div>
                <div className={styles.paneSplitPreview}>
                  <MarkdownPreview content={deferredContent} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <SettingsPanel
          isOpen={settingsOpen}
          onClose={handleCloseSettings}
          documentId={initialDoc.id}
          currentSettings={settings}
          onSettingsChange={handleSettingsChange}
        />
      </div>
    </ThemeProvider>
  )
}

export const EditorShell = memo(EditorShellInner)
EditorShell.displayName = 'EditorShell'