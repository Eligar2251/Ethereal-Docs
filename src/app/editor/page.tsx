import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/AppShell/AppShell'
import type { Document, DocumentSummary, Profile } from '@/types/database'

export default async function EditorPage() {
  const supabase = await createClient()

  // ── Auth guard ─────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // ── Fetch documents summary (fast list) ────────────────────
  const { data: documents } = await supabase
    .from('documents_summary')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(100)

  // ── Fetch user profile ─────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // ── ИСПРАВЛЕНО: первый документ грузим на сервере ──────────
  let initialActiveDocument: Document | null = null

  if (documents && documents.length > 0) {
    const firstId = documents[0].id

    const { data: fullDoc } = await supabase
      .from('documents')
      .select('*')
      .eq('id', firstId)
      .eq('user_id', user.id)
      .single()

    initialActiveDocument = (fullDoc as Document | null) ?? null
  }

  return (
    <AppShell
      initialDocuments={(documents ?? []) as DocumentSummary[]}
      initialActiveDocument={initialActiveDocument}
      profile={profile as Profile | null}
      userEmail={user.email ?? ''}
    />
  )
}