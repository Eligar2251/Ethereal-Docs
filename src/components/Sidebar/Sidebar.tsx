'use client'

import {
  useState,
  useCallback,
  useMemo,
  useTransition,
  memo,
} from 'react'
import {
  FileText,
  Plus,
  Search,
  LogOut,
} from 'lucide-react'
import { DocItem } from './DocItem'
import { signOut } from '@/app/auth/actions'
import type { DocumentSummary, Profile } from '@/types/database'
import styles from './Sidebar.module.css'

interface SidebarProps {
  documents: DocumentSummary[]
  activeDocumentId: string | null
  profile: Profile | null
  userEmail: string
  onSelectDocument: (id: string) => void
  onCreateDocument: () => Promise<string | null>
  onDeleteDocument: (id: string) => void
  isLoading?: boolean
}

function SkeletonList() {
  return (
    <div className={styles.skeleton}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={styles.skeletonItem}
          style={{ opacity: 1 - i * 0.15 }}
        />
      ))}
    </div>
  )
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(' ')
      .filter(Boolean)
      .map(p => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (email) {
    return email[0].toUpperCase()
  }

  return 'U'
}

function SidebarInner({
  documents,
  activeDocumentId,
  profile,
  userEmail,
  onSelectDocument,
  onCreateDocument,
  onDeleteDocument,
  isLoading = false,
}: SidebarProps) {
  const [search, setSearch] = useState('')
  const [isCreating, startCreateTransition] = useTransition()
  const [isSigningOut, startSignOutTransition] = useTransition()

  const filteredDocs = useMemo(() => {
    if (!search.trim()) return documents
    const q = search.toLowerCase()

    return documents.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.content_preview?.toLowerCase().includes(q)
    )
  }, [documents, search])

  const handleCreate = useCallback(() => {
    startCreateTransition(async () => {
      const newId = await onCreateDocument()
      if (newId) onSelectDocument(newId)
    })
  }, [onCreateDocument, onSelectDocument])

  const handleSignOut = useCallback(() => {
    startSignOutTransition(async () => {
      await signOut()
    })
  }, [])

  const initials = getInitials(profile?.display_name ?? null, userEmail)
  const fallbackName = userEmail ? userEmail.split('@')[0] : 'Account'

  return (
    <aside className={styles.root} aria-label="Document sidebar">
      <div className={styles.header}>
        <div className={styles.logo} aria-label="Ethereal Docs">
          <div className={styles.logoMark} aria-hidden="true">
            <FileText size={12} color="#FBFBF9" strokeWidth={1.5} />
          </div>
          Ethereal Docs
        </div>

        <button
          type="button"
          className={styles.newBtn}
          onClick={handleCreate}
          disabled={isCreating}
          aria-label="Create new document"
          title="New document"
        >
          <Plus size={14} strokeWidth={2} />
        </button>
      </div>

      <div className={styles.searchWrap}>
        <div className={styles.searchWrapInner}>
          <Search
            size={13}
            strokeWidth={1.5}
            className={styles.searchIcon}
            aria-hidden="true"
          />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search documents…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search documents"
          />
        </div>
      </div>

      <p className={styles.sectionLabel}>
        {search
          ? `${filteredDocs.length} result${filteredDocs.length !== 1 ? 's' : ''}`
          : 'Documents'}
      </p>

      <div
        className={styles.list}
        role="list"
        aria-label="Document list"
        aria-busy={isLoading}
      >
        {isLoading ? (
          <SkeletonList />
        ) : filteredDocs.length === 0 ? (
          <div className={styles.emptyState}>
            <FileText
              size={32}
              strokeWidth={1}
              className={styles.emptyIcon}
            />
            <p className={styles.emptyTitle}>
              {search ? 'No results found' : 'No documents yet'}
            </p>
            <p className={styles.emptyHint}>
              {search
                ? 'Try a different search term.'
                : 'Click + to create your first document.'}
            </p>
          </div>
        ) : (
          filteredDocs.map((doc, i) => (
            <DocItem
              key={doc.id}
              doc={doc}
              isActive={doc.id === activeDocumentId}
              onSelect={onSelectDocument}
              onDelete={onDeleteDocument}
              animationDelay={i * 0.04}
            />
          ))
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.userAvatar} aria-hidden="true">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.display_name ?? 'User'}
              width={28}
              height={28}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy"
            />
          ) : (
            initials
          )}
        </div>

        <div className={styles.userInfo}>
          <p className={styles.userName}>
            {profile?.display_name ?? fallbackName}
          </p>
          <p className={styles.userEmail}>{userEmail}</p>
        </div>

        <button
          type="button"
          className={styles.signOutBtn}
          onClick={handleSignOut}
          disabled={isSigningOut}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={14} strokeWidth={1.5} />
        </button>
      </div>
    </aside>
  )
}

export const Sidebar = memo(SidebarInner)
Sidebar.displayName = 'Sidebar'