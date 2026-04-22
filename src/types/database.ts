export type AppTheme = 'light' | 'dark' | 'sepia'
export type AppFont = 'serif' | 'sans'
export type EditorMode = 'split' | 'preview' | 'write'

export interface DocumentSettings {
  theme: AppTheme
  font: AppFont
  editorMode: EditorMode
  focusMode: boolean
}

export interface Document {
  id: string
  user_id: string
  title: string
  content: string
  settings: DocumentSettings
  is_deleted: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface DocumentSummary {
  id: string
  user_id: string
  title: string
  settings: DocumentSettings
  is_deleted: boolean
  created_at: string
  updated_at: string
  content_preview: string
}

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  theme: AppTheme
  font: AppFont
  editor_mode: EditorMode
  created_at: string
  updated_at: string
}