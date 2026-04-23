import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CookieOptions } from '@supabase/ssr'

function getEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `[Supabase] Missing required environment variable: "${name}"\n` +
      `Make sure it is defined in your .env.local file.`
    )
  }
  return value
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(
          cookiesToSet: Array<{
            name: string
            value: string
            options?: CookieOptions
          }>
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options ?? {})
            })
          } catch {
            // Server Component — mutations ignored safely
          }
        },
      },
    }
  )
}