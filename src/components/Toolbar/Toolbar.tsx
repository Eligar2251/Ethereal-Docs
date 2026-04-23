'use client'

import { memo, useCallback, useState } from 'react'
import {
  PanelLeft,
  Eye,
  PenLine,
  Columns2,
  Settings,
  Download,
  Loader2,
} from 'lucide-react'
import { SaveIndicator, type SaveState } from '@/components/SaveIndicator/SaveIndicator'
import type { EditorMode } from '@/types/database'
import styles from './Toolbar.module.css'

interface ToolbarProps {
  title: string
  onTitleChange: (title: string) => void
  editorMode: EditorMode
  onEditorModeChange: (mode: EditorMode) => void
  saveState: SaveState
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onOpenSettings: () => void
  content: string
}

const MODE_OPTIONS: {
  value: EditorMode
  label: string
  Icon: React.FC<{ size: number; strokeWidth: number }>
}[] = [
  { value: 'write', label: 'Write', Icon: (p) => <PenLine {...p} /> },
  { value: 'split', label: 'Split', Icon: (p) => <Columns2 {...p} /> },
  { value: 'preview', label: 'Preview', Icon: (p) => <Eye {...p} /> },
]

function ToolbarInner({
  title,
  onTitleChange,
  editorMode,
  onEditorModeChange,
  saveState,
  sidebarOpen,
  onToggleSidebar,
  onOpenSettings,
  content,
}: ToolbarProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onTitleChange(e.target.value),
    [onTitleChange]
  )

  const handleExport = useCallback(async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const { exportToWord } = await import('@/lib/exportToWord')
      await exportToWord(title || 'Untitled Document', content)
    } catch (err) {
      console.error('[Export] Failed:', err)
    } finally {
      setIsExporting(false)
    }
  }, [isExporting, title, content])

  return (
    <header className={styles.root} role="toolbar" aria-label="Document toolbar">
      <div className={styles.left}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          aria-pressed={sidebarOpen}
        >
          <PanelLeft size={16} strokeWidth={1.5} />
        </button>

        <div className={styles.divider} aria-hidden="true" />

        <input
          type="text"
          className={styles.titleInput}
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled Document"
          aria-label="Document title"
          maxLength={200}
        />
      </div>

      <div className={styles.center}>
        <div className={styles.modeGroup} role="group" aria-label="Editor mode">
          {MODE_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              className={styles.modeBtn}
              aria-pressed={editorMode === value}
              onClick={() => onEditorModeChange(value)}
              aria-label={`${label} mode`}
            >
              <Icon size={12} strokeWidth={1.5} />
              <span className={styles.modeLabel}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.right}>
        <SaveIndicator state={saveState} />

        <div className={styles.divider} aria-hidden="true" />

        <button
          type="button"
          className={styles.iconBtn}
          onClick={handleExport}
          disabled={isExporting}
          aria-label="Export to Word (.docx)"
          title="Export to Word"
        >
          {isExporting
            ? <Loader2 size={16} strokeWidth={1.5} className={styles.spin} />
            : <Download size={16} strokeWidth={1.5} />
          }
        </button>

        <button
          type="button"
          className={styles.iconBtn}
          onClick={onOpenSettings}
          aria-label="Open settings"
        >
          <Settings size={16} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  )
}

export const Toolbar = memo(ToolbarInner)
Toolbar.displayName = 'Toolbar'