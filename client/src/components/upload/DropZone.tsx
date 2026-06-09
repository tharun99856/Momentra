import { useCallback, useState, useRef } from 'react'
import styles from './DropZone.module.css'

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'video/mp4',
  'video/quicktime',
]

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB
const MAX_FILES = 50

export interface FileWithPreview {
  file: File
  preview: string
  id: string
  originalSize: number
  compressedSize?: number
  isCompressing?: boolean
  error?: string
}

interface DropZoneProps {
  files: FileWithPreview[]
  onFilesAdded: (files: FileWithPreview[]) => void
  disabled?: boolean
}

export default function DropZone({
  files,
  onFilesAdded,
  disabled,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return

      setError(null)

      const newFiles: FileWithPreview[] = []
      const errors: string[] = []

      // Check total count
      if (files.length + fileList.length > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files per batch`)
        return
      }

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]

        // Validate type
        if (!ACCEPTED_TYPES.includes(file.type)) {
          errors.push(`${file.name}: Unsupported file type`)
          continue
        }

        // Validate size
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: File exceeds 100 MB`)
          continue
        }

        const id = `${Date.now()}-${i}-${file.name}`
        const preview = await createPreview(file)

        newFiles.push({
          file,
          preview,
          id,
          originalSize: file.size,
        })
      }

      if (errors.length > 0) {
        setError(errors.join('; '))
      }

      if (newFiles.length > 0) {
        onFilesAdded(newFiles)
      }
    },
    [files.length, onFilesAdded]
  )

  const createPreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const { files } = e.dataTransfer
      processFiles(files)
    },
    [disabled, processFiles]
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processFiles(e.target.files)
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [processFiles]
  )

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }, [disabled])

  return (
    <div className={styles.container}>
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dragging : ''} ${
          disabled ? styles.disabled : ''
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileInputChange}
          className={styles.fileInput}
          disabled={disabled}
        />

        <div className={styles.dropZoneContent}>
          <div className={styles.uploadIcon}>📁</div>
          <p className={styles.mainText}>
            {isDragging
              ? 'Drop files here'
              : 'Drag and drop files here, or click to browse'}
          </p>
          <p className={styles.helperText}>
            Accepts JPEG, PNG, WebP, HEIC images and MP4, MOV videos
          </p>
          <p className={styles.helperText}>
            Maximum {MAX_FILES} files per batch • Max 100 MB per file
          </p>
        </div>

        {files.length > 0 && (
          <div className={styles.fileCount}>
            {files.length} / {MAX_FILES} files
          </div>
        )}
      </div>

      {error && (
        <div className={styles.errorToast} role="alert">
          <span className={styles.errorIcon}>⚠️</span>
          {error}
          <button
            className={styles.errorClose}
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
