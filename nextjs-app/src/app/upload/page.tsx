'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import DropZone, { type FileWithPreview } from '@/components/upload/DropZone'
import FilePreview from '@/components/upload/FilePreview'
import AuthGuard from '@/components/AuthGuard'
import AppLayout from '@/components/AppLayout'
import styles from './UploadPage.module.css'

export default function UploadPage() {
  return (
    <AuthGuard>
      <AppLayout>
        <UploadContent />
      </AppLayout>
    </AuthGuard>
  )
}

function UploadContent() {
  const router = useRouter()
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [tags, setTags] = useState('')
  const [caption, setCaption] = useState('')
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [isUploading, setIsUploading] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [failedUploads, setFailedUploads] = useState<Array<{ id: string; name: string; error: string }>>([])

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['all-events'],
    queryFn: async () => {
      const res = await apiClient.get('/api/events', { params: { pageSize: 100 } })
      return res.data.events ?? []
    },
  })

  const handleFilesAdded = useCallback(async (newFiles: FileWithPreview[]) => {
    const THRESHOLD = 5 * 1024 * 1024
    const processed = await Promise.all(
      newFiles.map(async (f) => {
        if (!f.file.type.startsWith('image/') || f.file.size <= THRESHOLD) return f
        return new Promise<FileWithPreview>((resolve) => {
          const img = new Image()
          const url = URL.createObjectURL(f.file)
          img.onload = () => {
            URL.revokeObjectURL(url)
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            canvas.getContext('2d')?.drawImage(img, 0, 0)
            canvas.toBlob((blob) => {
              if (!blob) { resolve(f); return }
              resolve({ ...f, file: new File([blob], f.file.name, { type: 'image/jpeg' }), compressedSize: blob.size })
            }, 'image/jpeg', 0.85)
          }
          img.onerror = () => { URL.revokeObjectURL(url); resolve(f) }
          img.src = url
        })
      })
    )
    setFiles((prev) => [...prev, ...processed])
  }, [])

  const handleUpload = useCallback(async () => {
    if (!selectedEventId || files.length === 0) return
    setIsUploading(true)
    setFailedUploads([])
    setBatchProgress(0)

    const formData = new FormData()
    formData.append('eventId', selectedEventId)
    files.forEach((f) => formData.append('files', f.file))
    if (tags.trim()) formData.append('tags', tags)
    if (caption.trim()) formData.append('caption', caption.trim())

    try {
      await apiClient.post('/api/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) {
            const pct = Math.round((e.loaded * 100) / e.total)
            setBatchProgress(pct)
            const perFile: Record<string, number> = {}
            files.forEach((f, i) => { perFile[f.id] = Math.min(100, Math.round((pct / files.length) * (i + 1))) })
            setUploadProgress(perFile)
          }
        },
      })
      setSuccessMessage(`Successfully uploaded ${files.length} file${files.length > 1 ? 's' : ''}`)
      setTimeout(() => router.push(`/events/${selectedEventId}`), 1500)
    } catch (err: any) {
      setFailedUploads(files.map((f) => ({ id: f.id, name: f.file.name, error: err.response?.data?.error ?? 'Upload failed' })))
    } finally {
      setIsUploading(false)
    }
  }, [selectedEventId, files, tags, caption, router])

  useEffect(() => {
    if (!successMessage) return
    const t = setTimeout(() => setSuccessMessage(null), 3000)
    return () => clearTimeout(t)
  }, [successMessage])

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Upload Media</h1>
        <p className={styles.subtitle}>Upload photos and videos to your event gallery</p>
      </div>

      <DropZone files={files} onFilesAdded={handleFilesAdded} disabled={isUploading} />

      {files.length > 0 && (
        <>
          <FilePreview files={files} uploadProgress={uploadProgress} onRemove={(id) => setFiles((p) => p.filter((f) => f.id !== id))} disabled={isUploading} />

          <div className={styles.metadataForm}>
            <h2 className={styles.formTitle}>Batch Metadata</h2>

            <div className={styles.formGroup}>
              <label htmlFor="event" className={styles.label}>Event <span className={styles.required}>*</span></label>
              <select id="event" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} disabled={isUploading || eventsLoading} className={styles.select} required>
                <option value="">Select an event</option>
                {eventsData?.map((ev: any) => (
                  <option key={ev.id} value={ev.id}>{ev.name} — {new Date(ev.date).toLocaleDateString()}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="tags" className={styles.label}>Tags (optional)</label>
              <input id="tags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="nature, sunset, portrait" disabled={isUploading} className={styles.input} />
              <span className={styles.hint}>Separate with commas</span>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="caption" className={styles.label}>Caption (optional)</label>
              <textarea id="caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption…" disabled={isUploading} className={styles.textarea} rows={3} maxLength={500} />
              <span className={styles.hint}>{caption.length} / 500</span>
            </div>

            {isUploading && (
              <div className={styles.batchProgress}>
                <div className={styles.progressLabel}>Overall Progress: {batchProgress}%</div>
                <div className={styles.batchProgressBar}><div className={styles.batchProgressFill} style={{ width: `${batchProgress}%` }} /></div>
              </div>
            )}

            {failedUploads.length > 0 && (
              <div className={styles.failedUploads} role="alert">
                <h3 className={styles.failedTitle}>Upload Errors</h3>
                <ul className={styles.failedList}>{failedUploads.map((f) => <li key={f.id} className={styles.failedItem}><strong>{f.name}:</strong> {f.error}</li>)}</ul>
                <button onClick={() => setFailedUploads([])} className={styles.retryButton}>Dismiss</button>
              </div>
            )}

            <div className={styles.actions}>
              <button onClick={handleUpload} disabled={isUploading || !selectedEventId} className={styles.uploadButton}>
                {isUploading ? 'Uploading…' : `Upload ${files.length} File${files.length > 1 ? 's' : ''}`}
              </button>
              <button onClick={() => { setFiles([]); setUploadProgress({}); setSelectedEventId(''); setTags(''); setCaption('') }} disabled={isUploading} className={styles.clearButton}>
                Clear All
              </button>
            </div>
          </div>
        </>
      )}

      {successMessage && (
        <div className={styles.successToast} role="status">
          <span className={styles.successIcon}>✓</span>
          {successMessage}
        </div>
      )}
    </main>
  )
}
