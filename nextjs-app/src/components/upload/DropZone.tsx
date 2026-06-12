'use client'

import { useCallback, useState, useRef } from 'react'
import styles from './DropZone.module.css'

const ACCEPTED_TYPES = ['image/jpeg','image/png','image/webp','image/heic','video/mp4','video/quicktime']
const MAX_FILE_SIZE = 100 * 1024 * 1024
const MAX_FILES = 50

export interface FileWithPreview {
  file: File; preview: string; id: string; originalSize: number;
  compressedSize?: number; isCompressing?: boolean; error?: string
}

interface DropZoneProps {
  files: FileWithPreview[]
  onFilesAdded: (files: FileWithPreview[]) => void
  disabled?: boolean
}

function createPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function DropZone({ files, onFilesAdded, disabled }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setError(null)
    if (files.length + fileList.length > MAX_FILES) { setError(`Maximum ${MAX_FILES} files per batch`); return }

    const newFiles: FileWithPreview[] = []
    const errors: string[] = []
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]!
      if (!ACCEPTED_TYPES.includes(file.type)) { errors.push(`${file.name}: Unsupported type`); continue }
      if (file.size > MAX_FILE_SIZE) { errors.push(`${file.name}: Exceeds 100 MB`); continue }
      const id = `${Date.now()}-${i}-${file.name}`
      const preview = await createPreview(file)
      newFiles.push({ file, preview, id, originalSize: file.size })
    }
    if (errors.length > 0) setError(errors.join('; '))
    if (newFiles.length > 0) onFilesAdded(newFiles)
  }, [files.length, onFilesAdded])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false)
    if (disabled) return
    void processFiles(e.dataTransfer.files)
  }, [disabled, processFiles])

  const handleClick = useCallback(() => { if (!disabled) fileInputRef.current?.click() }, [disabled])

  return (
    <div className={styles.container}>
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dragging : ''} ${disabled ? styles.disabled : ''}`}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); if (!disabled) setIsDragging(true) }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false) }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button" tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } }}
      >
        <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_TYPES.join(',')}
          onChange={(e) => void processFiles(e.target.files)} className={styles.fileInput} disabled={disabled} />
        <div className={styles.dropZoneContent}>
          <div className={styles.uploadIcon}>📁</div>
          <p className={styles.mainText}>{isDragging ? 'Drop files here' : 'Drag & drop files, or click to browse'}</p>
          <p className={styles.helperText}>JPEG, PNG, WebP, HEIC, MP4, MOV</p>
          <p className={styles.helperText}>Max {MAX_FILES} files · 100 MB each</p>
        </div>
        {files.length > 0 && <div className={styles.fileCount}>{files.length} / {MAX_FILES}</div>}
      </div>
      {error && (
        <div className={styles.errorToast} role="alert">
          <span className={styles.errorIcon}>⚠️</span>
          {error}
          <button className={styles.errorClose} onClick={() => setError(null)} aria-label="Dismiss">✕</button>
        </div>
      )}
    </div>
  )
}
