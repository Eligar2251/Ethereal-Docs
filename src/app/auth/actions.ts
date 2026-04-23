'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// ── Валидация входных данных ─────────────────────────────────
// Намеренно без внешних зависимостей (zod и т.п.) —
// минимум поверхности атаки, максимум контроля.

function validateEmail(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new Error('Email is required')
  }

  const trimmed = raw.trim().toLowerCase()

  if (trimmed.length === 0) {
    throw new Error('Email is required')
  }

  if (trimmed.length > 255) {
    throw new Error('Email address is too long')
  }

  // RFC 5322 упрощённая проверка
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error('Invalid email format')
  }

  return trimmed
}

function validatePassword(raw: unknown, minLength = 8): string {
  if (typeof raw !== 'string') {
    throw new Error('Password is required')
  }

  if (raw.length === 0) {
    throw new Error('Password is required')
  }

  if (raw.length < minLength) {
    throw new Error(`Password must be at least ${minLength} characters`)
  }

  if (raw.length > 128) {
    throw new Error('Password is too long')
  }

  return raw
}

function validateDisplayName(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new Error('Display name is required')
  }

  const trimmed = raw.trim()

  if (trimmed.length === 0) {
    throw new Error('Display name is required')
  }

  if (trimmed.length > 100) {
    throw new Error('Display name is too long')
  }

  // Убираем потенциально опасные HTML символы
  const sanitized = trimmed.replace(/[<>"'&]/g, '').trim()

  if (sanitized.length === 0) {
    throw new Error('Display name contains invalid characters')
  }

  return sanitized
}

// ── Server Actions ───────────────────────────────────────────

export async function signIn(formData: FormData) {
  const supabase = await createClient()

  let email: string
  let password: string

  try {
    // ── ИСПРАВЛЕНО: валидация перед передачей в Supabase ──────
    email = validateEmail(formData.get('email'))
    // При входе пароль может быть короче требований signup
    password = validatePassword(formData.get('password'), 6)
  } catch (err) {
    return { error: (err as Error).message }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Намеренно обобщённое сообщение — не раскрываем детали
    return { error: 'Invalid email or password' }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  let email: string
  let password: string
  let displayName: string

  try {
    // ── ИСПРАВЛЕНО: валидация всех полей ─────────────────────
    email = validateEmail(formData.get('email'))
    password = validatePassword(formData.get('password'), 8)
    displayName = validateDisplayName(formData.get('displayName'))
  } catch (err) {
    return { error: (err as Error).message }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: displayName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Check your email to confirm your account.' }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/auth/login')
}