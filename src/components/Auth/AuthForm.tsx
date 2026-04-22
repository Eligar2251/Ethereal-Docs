'use client'

import { useState, useTransition, useId } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { signIn, signUp } from '@/app/auth/actions'
import styles from './AuthForm.module.css'

type Mode = 'login' | 'signup'

interface FormState {
  error: string | null
  success: string | null
}

const PANEL_QUOTES = [
  {
    text: 'Writing is thinking. To write well is to think clearly.',
    author: '— David McCullough',
  },
]

// ── Framer Motion variants ────────────────────────────────────
const formVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
  },
}

const bannerVariants: Variants = {
  hidden: { opacity: 0, y: -6, height: 0 },
  visible: {
    opacity: 1,
    y: 0,
    height: 'auto',
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
  },
}

// ── Sub-components ────────────────────────────────────────────
function LogoMark() {
  return (
    <div className={styles.panelLogoMark}>
      <FileText size={14} color="#FBFBF9" strokeWidth={1.5} />
    </div>
  )
}

function FeedbackBanner({ state }: { state: FormState }) {
  return (
    <AnimatePresence mode="wait">
      {state.error && (
        <motion.div
          key="error"
          className={styles.errorBanner}
          variants={bannerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle size={15} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{state.error}</span>
        </motion.div>
      )}
      {state.success && (
        <motion.div
          key="success"
          className={styles.successBanner}
          variants={bannerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="status"
          aria-live="polite"
        >
          <CheckCircle size={15} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{state.success}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Main Component ────────────────────────────────────────────
export function AuthForm() {
  const [mode, setMode] = useState<Mode>('login')
  const [formState, setFormState] = useState<FormState>({ error: null, success: null })
  const [isPending, startTransition] = useTransition()

  const emailId = useId()
  const passwordId = useId()
  const nameId = useId()

  const quote = PANEL_QUOTES[0]

  function clearState() {
    setFormState({ error: null, success: null })
  }

  function toggleMode() {
    clearState()
    setMode(m => (m === 'login' ? 'signup' : 'login'))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    clearState()

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const action = mode === 'login' ? signIn : signUp
      const result = await action(formData)

      // signIn redirects on success — result only returned on error
      if (result) {
        setFormState({
          error: result.error ?? null,
          success: 'success' in result ? (result.success ?? null) : null,
        })
      }
    })
  }

  return (
    <div className={styles.root}>
      {/* ── Left decorative panel ── */}
      <div className={styles.panel} aria-hidden="true">
        <div className={styles.panelLogo}>
          <LogoMark />
          <span>Ethereal Docs</span>
        </div>

        <div>
          <p className={styles.panelQuote}>&ldquo;{quote.text}&rdquo;</p>
          <p className={styles.panelQuoteAuthor}>{quote.author}</p>
        </div>

        <div className={styles.panelDecor} />
      </div>

      {/* ── Right form side ── */}
      <div className={styles.formSide}>
        <div className={styles.formContainer}>
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              variants={formVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Header */}
              <div className={styles.formHeader}>
                <h1 className={styles.formTitle}>
                  {mode === 'login' ? 'Welcome back' : 'Create an account'}
                </h1>
                <p className={styles.formSubtitle}>
                  {mode === 'login'
                    ? 'Sign in to continue to Ethereal Docs.'
                    : 'Start writing beautifully today.'}
                </p>
              </div>

              {/* Feedback */}
              <FeedbackBanner state={formState} />

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate>
                <div className={styles.fieldGroup}>
                  {/* Display name — signup only */}
                  <AnimatePresence>
                    {mode === 'signup' && (
                      <motion.div
                        key="name-field"
                        className={styles.field}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{
                          opacity: 1,
                          height: 'auto',
                          transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
                        }}
                        exit={{
                          opacity: 0,
                          height: 0,
                          transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
                        }}
                      >
                        <label htmlFor={nameId} className={styles.label}>
                          Full name
                        </label>
                        <input
                          id={nameId}
                          name="displayName"
                          type="text"
                          placeholder="Ada Lovelace"
                          autoComplete="name"
                          className={styles.input}
                          required={mode === 'signup'}
                          disabled={isPending}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Email */}
                  <div className={styles.field}>
                    <label htmlFor={emailId} className={styles.label}>
                      Email address
                    </label>
                    <input
                      id={emailId}
                      name="email"
                      type="email"
                      placeholder="ada@example.com"
                      autoComplete={mode === 'login' ? 'email' : 'email'}
                      className={styles.input}
                      aria-invalid={!!formState.error}
                      required
                      disabled={isPending}
                    />
                  </div>

                  {/* Password */}
                  <div className={styles.field}>
                    <label htmlFor={passwordId} className={styles.label}>
                      Password
                    </label>
                    <input
                      id={passwordId}
                      name="password"
                      type="password"
                      placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className={styles.input}
                      aria-invalid={!!formState.error}
                      required
                      minLength={mode === 'signup' ? 8 : undefined}
                      disabled={isPending}
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={isPending}
                  aria-busy={isPending}
                >
                  {isPending ? (
                    <>
                      <span className={styles.spinner} aria-hidden="true" />
                      {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                    </>
                  ) : (
                    mode === 'login' ? 'Sign in' : 'Create account'
                  )}
                </button>
              </form>

              {/* Toggle mode */}
              <p className={styles.toggleText}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  type="button"
                  className={styles.toggleBtn}
                  onClick={toggleMode}
                  disabled={isPending}
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}