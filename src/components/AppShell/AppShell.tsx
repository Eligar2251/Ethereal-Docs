'use client'

import {
  useState,
  useCallback,
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
}

function AppShellInner({
  initialDocuments,
  initialActiveDocument,
  profile,
  userEmail,
}: AppShellProps) {
  const [documents, setDocuments] = useState<DocumentSummary[]>(initialDocuments)
  const [activeDocument, setActiveDocument] = useState<Document | null>(initialActiveDocument)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isDocListLoading] = useState(false)

  const loadDocument = useCallback((id: string) => {
    const supabase = createClient()

    supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setActiveDocument(data as Document)
        }
      })
  }, [])

  const handleSelectDocument = useCallback(
    (id: string) => {
      if (activeDocument?.id === id) return
      loadDocument(id)
    },
    [activeDocument?.id, loadDocument]
  )

  const handleCreateDocument = useCallback(async (): Promise<string | null> => {
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        title: 'Untitled Document',
        content: '',
        settings: DEFAULT_SETTINGS,
      })
      .select(
        'id, user_id, title, settings, is_deleted, created_at, updated_at, content_preview:content'
      )
      .single()

    if (error || !data) {
      console.error('[Create] Failed:', error?.message)
      return null
    }

    const summary: DocumentSummary = {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      settings: data.settings,
      is_deleted: data.is_deleted,
      created_at: data.created_at,
      updated_at: data.updated_at,
      content_preview: '',
    }

    setDocuments(prev => [summary, ...prev])

    // Сразу открываем новый документ локально
    setActiveDocument({
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      content: '',
      settings: data.settings,
      is_deleted: data.is_deleted,
      deleted_at: null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    } as Document)

    return data.id
  }, [])

  const handleDeleteDocument = useCallback(
    async (id: string) => {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.error('[Delete] No authenticated user')
        return
      }

      const { error } = await supabase
        .from('documents')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('[Delete] Failed:', error.message)
        return
      }

      setDocuments(prev => prev.filter(d => d.id !== id))

      if (activeDocument?.id === id) {
        setActiveDocument(null)
      }
    },
    [activeDocument?.id]
  )

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [])

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
              key={activeDocument.id}
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
                onDocumentUpdate={(update) => {
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