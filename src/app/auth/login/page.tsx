import type { Metadata } from 'next'
import { AuthForm } from '@/components/Auth/AuthForm'

export const metadata: Metadata = {
  title: 'Sign In',
}

export default function LoginPage() {
  return <AuthForm />
}