import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/AppShell/AppShell'
import type { DocumentSummary, Profile } from '@/types/database'

export default async function EditorPage() {
  const supabase = await createClient()

  // ── Auth guard ─────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // ── Fetch documents summary (no content — fast) ────────────
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

  return (
    <AppShell
      initialDocuments={(documents ?? []) as DocumentSummary[]}
      profile={profile as Profile | null}
    />
  )
}