'use client'

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  memo,
} from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from '@/components/Sidebar/Sidebar'
import { createClient } from '@/lib/supabase/client'
import type {
  Document,
  DocumentSummary,
  Profile,
  DocumentSettings,
} from '@/types/database'
import styles from './AppShell.module.css'

const EditorShell = dynamic(
  () =>
    import('@/components/EditorShell/EditorShell').then(m => ({
      default: m.EditorShell,
    })),
  { ssr: false }
)

const DEFAULT_SETTINGS: DocumentSettings = {
  theme: 'light',
  font: 'serif',
  editorMode: 'split',
  focusMode: false,
}

const SIDEBAR_WIDTH = 260
const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 }

interface AppShellProps {
  initialDocuments: DocumentSummary[]
  initialActiveDocument: Document | null
  profile: Profile | null
  userEmail: string
  userId: string
}

function AppShellInner({
  initialDocuments,
  initialActiveDocument,
  profile,
  userEmail,
  userId,
}: AppShellProps) {
  const [documents, setDocuments] = useState<DocumentSummary[]>(initialDocuments)
  const [activeDocument, setActiveDocument] = useState<Document | null>(initialActiveDocument)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isDocListLoading] = useState(false)

  // ── Кэш уже загруженных документов ──────────────────────────
  const documentCacheRef = useRef<Map<string, Document>>(
    new Map(
      initialActiveDocument
        ? [[initialActiveDocument.id, initialActiveDocument]]
        : []
    )
  )

  // ── Защита от повторных запросов одного и того же документа ─
  const pendingLoadsRef = useRef<Set<string>>(new Set())

  const loadDocument = useCallback(
    async (id: string) => {
      // 1. Если уже в кэше — открываем мгновенно
      const cached = documentCacheRef.current.get(id)
      if (cached) {
        setActiveDocument(cached)
        return
      }

      // 2. Если уже загружается — не дублируем запрос
      if (pendingLoadsRef.current.has(id)) return
      pendingLoadsRef.current.add(id)

      try {
        const supabase = createClient()

        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .single()

        if (!error && data) {
          const doc = data as Document
          documentCacheRef.current.set(id, doc)
          setActiveDocument(doc)
        } else if (error) {
          console.error('[Load document] Failed:', error.message)
        }
      } catch (error) {
        console.error('[Load document] Network error:', error)
      } finally {
        pendingLoadsRef.current.delete(id)
      }
    },
    [userId]
  )

  const handleSelectDocument = useCallback(
    (id: string) => {
      if (activeDocument?.id === id) return
      void loadDocument(id)
    },
    [activeDocument?.id, loadDocument]
  )

  const handleCreateDocument = useCallback(async (): Promise<string | null> => {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          title: 'Untitled Document',
          content: '',
          settings: DEFAULT_SETTINGS,
        })
        .select('*')
        .single()

      if (error || !data) {
        console.error('[Create] Failed:', error?.message)
        return null
      }

      const doc = data as Document

      const summary: DocumentSummary = {
        id: doc.id,
        user_id: doc.user_id,
        title: doc.title,
        settings: doc.settings,
        is_deleted: doc.is_deleted,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        content_preview: '',
      }

      documentCacheRef.current.set(doc.id, doc)
      setDocuments(prev => [summary, ...prev])
      setActiveDocument(doc)

      return doc.id
    } catch (error) {
      console.error('[Create] Network error:', error)
      return null
    }
  }, [userId])

  const handleDeleteDocument = useCallback(
    async (id: string) => {
      try {
        const supabase = createClient()

        const { error } = await supabase
          .from('documents')
          .update({
            is_deleted: true,
            deleted_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', userId)

        if (error) {
          console.error('[Delete] Failed:', error.message)
          return
        }

        documentCacheRef.current.delete(id)
        setDocuments(prev => prev.filter(d => d.id !== id))

        if (activeDocument?.id === id) {
          const remaining = documents.filter(d => d.id !== id)
          const nextId = remaining[0]?.id ?? null

          if (nextId) {
            const cached = documentCacheRef.current.get(nextId)
            setActiveDocument(cached ?? null)
            if (!cached) void loadDocument(nextId)
          } else {
            setActiveDocument(null)
          }
        }
      } catch (error) {
        console.error('[Delete] Network error:', error)
      }
    },
    [activeDocument?.id, documents, loadDocument, userId]
  )

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        setSidebarOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const rootKey = useMemo(
    () => activeDocument?.id ?? 'welcome',
    [activeDocument?.id]
  )

  return (
    <div className={styles.root}>
      <motion.div
        className={styles.sidebarWrapper}
        animate={{
          width: sidebarOpen ? SIDEBAR_WIDTH : 0,
          opacity: sidebarOpen ? 1 : 0,
        }}
        transition={SPRING}
        aria-hidden={!sidebarOpen}
      >
        <Sidebar
          documents={documents}
          activeDocumentId={activeDocument?.id ?? null}
          profile={profile}
          userEmail={userEmail}
          onSelectDocument={handleSelectDocument}
          onCreateDocument={handleCreateDocument}
          onDeleteDocument={handleDeleteDocument}
          isLoading={isDocListLoading}
        />
      </motion.div>

      <main className={styles.editorArea}>
        <AnimatePresence mode="wait">
          {activeDocument ? (
            <motion.div
              key={rootKey}
              className={styles.editorPane}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
              }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              <EditorShell
                document={activeDocument}
                userId={userId}
                onDocumentUpdate={(update) => {
                  setActiveDocument(prev => {
                    if (!prev) return prev
                    const next = { ...prev, ...update }
                    documentCacheRef.current.set(prev.id, next as Document)
                    return next as Document
                  })

                  if (update.title !== undefined) {
                    setDocuments(prev =>
                      prev.map(d =>
                        d.id === activeDocument.id
                          ? {
                              ...d,
                              title: update.title!,
                              updated_at: new Date().toISOString(),
                            }
                          : d
                      )
                    )
                  }
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="welcome"
              className={styles.welcome}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
              }}
              exit={{ opacity: 0 }}
            >
              <p className={styles.welcomeTitle}>Nothing open yet.</p>
              <p className={styles.welcomeHint}>
                Select a document from the sidebar or create a new one.
              </p>
              <div className={styles.welcomeShortcut} aria-label="Keyboard shortcut">
                <kbd className={styles.kbd}>⌘</kbd>
                <kbd className={styles.kbd}>\</kbd>
                <span className={styles.welcomeShortcutHint}>toggle sidebar</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export const AppShell = memo(AppShellInner)
AppShell.displayName = 'AppShell'