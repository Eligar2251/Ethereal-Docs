'use client'

import {
  useState,
  useCallback,
  useId,
  useTransition,
  memo,
  type CSSProperties,
  type MouseEvent,
} from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AppTheme, AppFont, DocumentSettings } from '@/types/database'
import styles from './SettingsPanel.module.css'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  currentSettings: DocumentSettings
  onSettingsChange: (settings: DocumentSettings) => void
}

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
  },
}

const panelVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
    scale: 0.97,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 32,
    },
  },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.97,
    transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
  },
}

const THEMES: { value: AppTheme; label: string; swatchClass: string }[] = [
  { value: 'light', label: 'Light', swatchClass: styles.swatchLight },
  { value: 'dark', label: 'Dark', swatchClass: styles.swatchDark },
  { value: 'sepia', label: 'Sepia', swatchClass: styles.swatchSepia },
]

const FONTS: { value: AppFont; label: string; sample: string; sampleClass: string }[] = [
  {
    value: 'serif',
    label: 'Serif',
    sample: 'The quick brown fox…',
    sampleClass: styles.fontSampleSerif,
  },
  {
    value: 'sans',
    label: 'Sans-serif',
    sample: 'The quick brown fox…',
    sampleClass: styles.fontSampleSans,
  },
]

const savedStateStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
}

interface ToggleSwitchProps {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  hint?: string
}

function ToggleSwitch({
  id,
  checked,
  onChange,
  label,
  hint,
}: ToggleSwitchProps) {
  return (
    <div className={styles.toggleRow}>
      <div className={styles.toggleLabel}>
        <span className={styles.toggleLabelText}>{label}</span>
        {hint && <span className={styles.toggleLabelHint}>{hint}</span>}
      </div>

      <label className={styles.toggle} htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          className={styles.toggleInput}
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          aria-label={label}
        />
        <span className={styles.toggleTrack} aria-hidden="true" />
        <motion.span
          className={styles.toggleThumb}
          animate={{ x: checked ? 16 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          aria-hidden="true"
        />
      </label>
    </div>
  )
}

function SettingsPanelInner({
  isOpen,
  onClose,
  documentId,
  currentSettings,
  onSettingsChange,
}: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<DocumentSettings>(currentSettings)
  const [isSaving, startSaveTransition] = useTransition()
  const [savedFlash, setSavedFlash] = useState(false)

  const focusModeId = useId()

  const handleOpen = useCallback(() => {
    setLocalSettings(currentSettings)
  }, [currentSettings])

  const update = useCallback(
    <K extends keyof DocumentSettings>(key: K, value: DocumentSettings[K]) => {
      setLocalSettings(prev => ({ ...prev, [key]: value }))
    },
    []
  )

  const handleSave = useCallback(() => {
    startSaveTransition(async () => {
      const supabase = createClient()

      const { error } = await supabase
        .from('documents')
        .update({ settings: localSettings })
        .eq('id', documentId)

      if (!error) {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          await supabase
            .from('profiles')
            .update({
              theme: localSettings.theme,
              font: localSettings.font,
            })
            .eq('id', user.id)
        }

        onSettingsChange(localSettings)
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 1500)
      }
    })
  }, [documentId, localSettings, onSettingsChange])

  const handleBackdropClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose]
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.backdrop}
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-label="Document settings"
          onAnimationStart={handleOpen}
        >
          <motion.div
            className={styles.panel}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Appearance</h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={onClose}
                aria-label="Close settings"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <div className={styles.panelBody}>
              <section className={styles.section}>
                <p className={styles.sectionLabel}>Theme</p>
                <div
                  className={styles.themeGrid}
                  role="radiogroup"
                  aria-label="Select theme"
                >
                  {THEMES.map(({ value, label, swatchClass }) => {
                    const isActive = localSettings.theme === value

                    return (
                      <button
                        key={value}
                        type="button"
                        className={styles.themeSwatch}
                        onClick={() => update('theme', value)}
                        aria-pressed={isActive}
                        aria-label={`${label} theme`}
                      >
                        <div
                          className={`${styles.swatchPreview} ${swatchClass}`}
                          data-active={isActive}
                        >
                          <div className={styles.swatchLines}>
                            <div className={styles.swatchLine} />
                            <div className={styles.swatchLine} />
                            <div className={styles.swatchLine} />
                          </div>

                          <AnimatePresence>
                            {isActive && (
                              <motion.div
                                className={styles.swatchCheck}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{
                                  scale: 1,
                                  opacity: 1,
                                  transition: {
                                    type: 'spring',
                                    stiffness: 500,
                                    damping: 28,
                                  },
                                }}
                                exit={{ scale: 0, opacity: 0 }}
                              >
                                <Check size={10} strokeWidth={2.5} color="#FBFBF9" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <span className={styles.swatchLabel}>{label}</span>
                      </button>
                    )
                  })}
                </div>
              </section>

              <div className={styles.divider} aria-hidden="true" />

              <section className={styles.section}>
                <p className={styles.sectionLabel}>Font Style</p>
                <div
                  className={styles.fontOptions}
                  role="radiogroup"
                  aria-label="Select font style"
                >
                  {FONTS.map(({ value, label, sample, sampleClass }) => {
                    const isActive = localSettings.font === value

                    return (
                      <button
                        key={value}
                        type="button"
                        className={styles.fontOption}
                        data-active={isActive}
                        onClick={() => update('font', value)}
                        aria-pressed={isActive}
                        aria-label={`${label} font`}
                      >
                        <div className={styles.fontOptionLeft}>
                          <span className={styles.fontName}>{label}</span>
                          <span className={`${styles.fontSample} ${sampleClass}`}>
                            {sample}
                          </span>
                        </div>
                        <span
                          className={styles.fontActiveDot}
                          data-active={isActive}
                          aria-hidden="true"
                        />
                      </button>
                    )
                  })}
                </div>
              </section>

              <div className={styles.divider} aria-hidden="true" />

              <section className={styles.section}>
                <p className={styles.sectionLabel}>Writing</p>
                <ToggleSwitch
                  id={focusModeId}
                  checked={localSettings.focusMode}
                  onChange={val => update('focusMode', val)}
                  label="Focus Mode"
                  hint="UI fades away while typing"
                />
              </section>
            </div>

            <div className={styles.panelFooter}>
              <span className={styles.footerHint}>
                Settings apply to this document.
              </span>

              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={isSaving}
                aria-busy={isSaving}
              >
                <AnimatePresence mode="wait">
                  {savedFlash ? (
                    <motion.span
                      key="saved"
                      style={savedStateStyle}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Check size={12} strokeWidth={2} />
                      Saved
                    </motion.span>
                  ) : (
                    <motion.span
                      key="save"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {isSaving ? 'Saving…' : 'Apply & Save'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const SettingsPanel = memo(SettingsPanelInner)