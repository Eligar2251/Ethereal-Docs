'use client'

import { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Clock } from 'lucide-react'
import styles from './SessionExpiredBanner.module.css'

interface SessionExpiredBannerProps {
  hasUnsavedContent?: boolean
}

function SessionExpiredBannerInner({
  hasUnsavedContent = false,
}: SessionExpiredBannerProps) {
  const handleReload = useCallback(() => {
    window.location.reload()
  }, [])

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
      role="alertdialog"
      aria-modal="true"
      aria-label="Session expired"
    >
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            type: 'spring',
            stiffness: 400,
            damping: 32,
            delay: 0.05,
          },
        }}
      >
        <div className={styles.icon} aria-hidden="true">
          <Clock size={22} strokeWidth={1.5} />
        </div>

        <h2 className={styles.title}>Session expired</h2>

        <p className={styles.description}>
          Your session has expired due to inactivity.
          Please reload the page to continue.
        </p>

        {hasUnsavedContent && (
          <div className={styles.unsavedWarning} role="alert">
            <div className={styles.saveDot} aria-hidden="true" />
            <p className={styles.unsavedWarningText}>
              You may have unsaved changes. After reloading, your last
              auto-saved version will be restored from the server.
            </p>
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.reloadBtn}
            onClick={handleReload}
            autoFocus
          >
            <RefreshCw size={14} strokeWidth={1.5} />
            Reload page
          </button>
        </div>

        <p className={styles.hint}>
          Your documents are safely stored in the cloud.
        </p>
      </motion.div>
    </motion.div>
  )
}

export const SessionExpiredBanner = memo(SessionExpiredBannerInner)
SessionExpiredBanner.displayName = 'SessionExpiredBanner'