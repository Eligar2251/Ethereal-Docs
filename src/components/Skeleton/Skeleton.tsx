import clsx from 'clsx'
import styles from './Skeleton.module.css'

interface SkeletonProps {
  variant?: 'text' | 'heading' | 'block' | 'circle'
  width?: string | number
  height?: string | number
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className,
  style,
}: SkeletonProps) {
  return (
    <div
      className={clsx(styles.root, styles[variant], className)}
      style={{ width, height, ...style }}
      aria-hidden="true"
      role="presentation"
    />
  )
}

// Compound: full editor loading state
export function EditorSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        padding: '48px 56px',
        maxWidth: 680,
        margin: '0 auto',
      }}
    >
      <Skeleton variant="heading" width="55%" />
      <Skeleton variant="text"    width="90%" />
      <Skeleton variant="text"    width="78%" />
      <Skeleton variant="text"    width="85%" />
      <Skeleton variant="text"    width="60%" />
      <div style={{ marginTop: 12 }}>
        <Skeleton variant="block" width="100%" height={100} />
      </div>
      <Skeleton variant="text" width="88%" />
      <Skeleton variant="text" width="72%" />
    </div>
  )
}