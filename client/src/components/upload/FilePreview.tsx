import { FileWithPreview } from './DropZone'
import styles from './FilePreview.module.css'

interface FilePreviewProps {
  files: FileWithPreview[]
  uploadProgress: Record<string, number>
  onRemove: (id: string) => void
  disabled?: boolean
}

export default function FilePreview({
  files,
  uploadProgress,
  onRemove,
  disabled,
}: FilePreviewProps) {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  if (files.length === 0) return null

  return (
    <div className={styles.grid}>
      {files.map((fileWithPreview) => {
        const progress = uploadProgress[fileWithPreview.id] ?? 0
        const isUploading = progress > 0 && progress < 100
        const isComplete = progress === 100
        const { isCompressing, compressedSize, originalSize, error } =
          fileWithPreview

        return (
          <div key={fileWithPreview.id} className={styles.card}>
            <div className={styles.previewContainer}>
              {fileWithPreview.file.type.startsWith('image/') ? (
                <img
                  src={fileWithPreview.preview}
                  alt={fileWithPreview.file.name}
                  className={styles.preview}
                />
              ) : (
                <div className={styles.videoPlaceholder}>
                  <span className={styles.videoIcon}>🎬</span>
                </div>
              )}

              {!disabled && (
                <button
                  className={styles.removeButton}
                  onClick={() => onRemove(fileWithPreview.id)}
                  disabled={isUploading}
                  aria-label={`Remove ${fileWithPreview.file.name}`}
                >
                  ✕
                </button>
              )}

              {isCompressing && (
                <div className={styles.overlay}>
                  <div className={styles.spinner} />
                  <span className={styles.overlayText}>Compressing...</span>
                </div>
              )}

              {isComplete && (
                <div className={styles.checkmark}>✓</div>
              )}
            </div>

            <div className={styles.info}>
              <p className={styles.filename} title={fileWithPreview.file.name}>
                {fileWithPreview.file.name}
              </p>

              <div className={styles.size}>
                {compressedSize && compressedSize !== originalSize ? (
                  <>
                    <span className={styles.originalSize}>
                      {formatBytes(originalSize)}
                    </span>
                    {' → '}
                    <span className={styles.compressedSize}>
                      {formatBytes(compressedSize)}
                    </span>
                  </>
                ) : (
                  <span>{formatBytes(originalSize)}</span>
                )}
              </div>

              {error && (
                <div className={styles.error} role="alert">
                  {error}
                </div>
              )}

              {isUploading && (
                <div className={styles.progressContainer}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
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
