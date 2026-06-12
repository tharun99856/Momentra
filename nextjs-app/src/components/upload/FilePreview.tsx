'use client'

import type { FileWithPreview } from './DropZone'
import styles from './FilePreview.module.css'

interface FilePreviewProps {
  files: FileWithPreview[]
  uploadProgress: Record<string, number>
  onRemove: (id: string) => void
  disabled?: boolean
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024, sizes = ['B','KB','MB','GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export default function FilePreview({ files, uploadProgress, onRemove, disabled }: FilePreviewProps) {
  if (files.length === 0) return null
  return (
    <div className={styles.grid}>
      {files.map((f) => {
        const progress = uploadProgress[f.id] ?? 0
        const isUploading = progress > 0 && progress < 100
        const isComplete = progress === 100
        return (
          <div key={f.id} className={styles.card}>
            <div className={styles.previewContainer}>
              {f.file.type.startsWith('image/') ? (
                <img src={f.preview} alt={f.file.name} className={styles.preview} />
              ) : (
                <div className={styles.videoPlaceholder}><span className={styles.videoIcon}>🎬</span></div>
              )}
              {!disabled && (
                <button className={styles.removeButton} onClick={() => onRemove(f.id)} disabled={isUploading} aria-label={`Remove ${f.file.name}`}>✕</button>
              )}
              {f.isCompressing && (
                <div className={styles.overlay}><div className={styles.spinner} /><span className={styles.overlayText}>Compressing…</span></div>
              )}
              {isComplete && <div className={styles.checkmark}>✓</div>}
            </div>
            <div className={styles.info}>
              <p className={styles.filename} title={f.file.name}>{f.file.name}</p>
              <div className={styles.size}>
                {f.compressedSize && f.compressedSize !== f.originalSize ? (
                  <><span className={styles.originalSize}>{formatBytes(f.originalSize)}</span>{' → '}<span className={styles.compressedSize}>{formatBytes(f.compressedSize)}</span></>
                ) : <span>{formatBytes(f.originalSize)}</span>}
              </div>
              {f.error && <div className={styles.error} role="alert">{f.error}</div>}
              {isUploading && (
                <div className={styles.progressContainer}>
                  <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${progress}%` }} /></div>
                  <span className={styles.progressText}>{progress}%</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
