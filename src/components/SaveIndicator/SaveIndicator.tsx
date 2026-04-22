'use client'

import { motion, AnimatePresence } from 'framer-motion'
import styles from './SaveIndicator.module.css'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface SaveIndicatorProps {
  state: SaveState
}

const LABELS: Record<SaveState, string> = {
  idle:   '',
  saving: 'Saving…',
  saved:  'Saved',
  error:  'Save failed',
}

const spring = { type: 'spring' as const, stiffness: 400, damping: 28 }

export function SaveIndicator({ state }: SaveIndicatorProps) {
  if (state === 'idle') return null

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        className={styles.root}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1, transition: spring }}
        exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
        aria-live="polite"
        aria-label={LABELS[state]}
      >
        <motion.span
          className={styles.dot}
          data-state={state}
          initial={{ scale: 0 }}
          animate={{ scale: 1, transition: spring }}
        />
        <span>{LABELS[state]}</span>
      </motion.div>
    </AnimatePresence>
  )
}