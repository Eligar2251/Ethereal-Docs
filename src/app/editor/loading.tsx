import { EditorSkeleton } from '@/components/Skeleton/Skeleton'

export default function EditorLoading() {
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--color-base)',
      }}
    >
      {/* Sidebar skeleton */}
      <div
        style={{
          width: 260,
          borderRight: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <EditorSkeleton />
        </div>
      </div>

      {/* Editor skeleton */}
      <div style={{ flex: 1 }}>
        <EditorSkeleton />
      </div>
    </div>
  )
}