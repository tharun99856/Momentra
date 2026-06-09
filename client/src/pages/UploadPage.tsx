import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import DropZone, { FileWithPreview } from '../components/upload/DropZone'
import FilePreview from '../components/upload/FilePreview'
import styles from './UploadPage.module.css'

const COMPRESSION_THRESHOLD = 5 * 1024 * 1024 // 5 MB
const COMPRESSION_QUALITY = 0.85

interface Event {
  id: string
  name: string
  date: string
  coverPhotoUrl?: string
}

export default function UploadPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [tags, setTags] = useState<string>('')
  const [caption, setCaption] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [isUploading, setIsUploading] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [failedUploads, setFailedUploads] = useState<Array<{ id: string; name: string; error: string }>>([])

  // Fetch events for dropdown
  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['all-events'],
    queryFn: async () => {
      const response = await apiClient.get('/api/events', { params: { pageSize: 100 } })
      return response.data.events ?? []
    },
  })

  const compressImage = useCallback(
    async (file: File): Promise<{ blob: Blob; size: number }> => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        const objectUrl = URL.createObjectURL(file)

        img.onload = () => {
          URL.revokeObjectURL(objectUrl)

          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          // Maintain aspect ratio
          canvas.width = img.width
          canvas.height = img.height

          ctx.drawImage(img, 0, 0)

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'))
                return
              }
              resolve({ blob, size: blob.size })
            },
            'image/jpeg',
            COMPRESSION_QUALITY
          )
        }

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl)
          reject(new Error('Failed to load image'))
        }

        img.src = objectUrl
      })
    },
    []
  )

  const handleFilesAdded = useCallback(
    async (newFiles: FileWithPreview[]) => {
      // Process compression for large images
      const processedFiles = await Promise.all(
        newFiles.map(async (fileWithPreview) => {
          const isImage = fileWithPreview.file.type.startsWith('image/')
          const shouldCompress =
            isImage && fileWithPreview.file.size > COMPRESSION_THRESHOLD

          if (!shouldCompress) {
            return fileWithPreview
          }

          // Mark as compressing
          const compressingFile = { ...fileWithPreview, isCompressing: true }
          setFiles((prev) => [...prev, compressingFile])

          try {
            const { blob, size } = await compressImage(fileWithPreview.file)
            const compressedFile = new File([blob], fileWithPreview.file.name, {
              type: 'image/jpeg',
            })

            return {
              ...fileWithPreview,
              file: compressedFile,
              compressedSize: size,
              isCompressing: false,
            }
          } catch (error) {
            console.error('Compression failed:', error)
            return {
              ...fileWithPreview,
              isCompressing: false,
              error: 'Compression failed, using original',
            }
          }
        })
      )

      setFiles((prev) => {
        // Remove compressing placeholders and add processed files
        const withoutCompressing = prev.filter((f) => !f.isCompressing)
        return [...withoutCompressing, ...processedFiles]
      })
    },
    [compressImage]
  )

  const handleFileRemove = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    setUploadProgress((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const handleUpload = useCallback(async () => {
    if (!selectedEventId) {
      alert('Please select an event')
      return
    }

    if (files.length === 0) {
      alert('Please add at least one file')
      return
    }

    setIsUploading(true)
    setFailedUploads([])
    setBatchProgress(0)

    const formData = new FormData()
    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    files.forEach((fileWithPreview) => {
      formData.append('files', fileWithPreview.file)
    })

    if (tagArray.length > 0) {
      formData.append('tags', JSON.stringify(tagArray))
    }

    if (caption.trim()) {
      formData.append('caption', caption.trim())
    }

    try {
      await apiClient.post(
        `/api/events/${selectedEventId}/media`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentComplete = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              )
              setBatchProgress(percentComplete)

              // Simulate per-file progress (simplified)
              const perFileProgress = percentComplete / files.length
              const progress: Record<string, number> = {}
              files.forEach((f, index) => {
                progress[f.id] = Math.min(
                  100,
                  Math.round(perFileProgress * (index + 1))
                )
              })
              setUploadProgress(progress)
            }
          },
        }
      )

      // Success
      setSuccessMessage(
        `Successfully uploaded ${files.length} file${files.length > 1 ? 's' : ''}`
      )

      // Navigate to event page after short delay
      setTimeout(() => {
        navigate(`/events/${selectedEventId}`)
      }, 1500)
    } catch (error: any) {
      console.error('Upload failed:', error)

      // Track failed uploads
      const failed = files.map((f) => ({
        id: f.id,
        name: f.file.name,
        error: error.response?.data?.error || 'Upload failed',
      }))
      setFailedUploads(failed)
    } finally {
      setIsUploading(false)
    }
  }, [selectedEventId, files, tags, caption, navigate])

  const handleRetryFailed = useCallback(() => {
    // Keep only failed files
    setFiles((prev) =>
      prev.filter((f) => failedUploads.some((failed) => failed.id === f.id))
    )
    setFailedUploads([])
    setUploadProgress({})
  }, [failedUploads])

  const handleClearAll = useCallback(() => {
    setFiles([])
    setUploadProgress({})
    setFailedUploads([])
    setSelectedEventId('')
    setTags('')
    setCaption('')
    setSuccessMessage(null)
  }, [])

  // Auto-dismiss success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Upload Media</h1>
        <p className={styles.subtitle}>
          Upload photos and videos to your event gallery
        </p>
      </div>

      <DropZone
        files={files}
        onFilesAdded={handleFilesAdded}
        disabled={isUploading}
      />

      {files.length > 0 && (
        <>
          <FilePreview
            files={files}
            uploadProgress={uploadProgress}
            onRemove={handleFileRemove}
            disabled={isUploading}
          />

          <div className={styles.metadataForm}>
            <h2 className={styles.formTitle}>Batch Metadata</h2>

            <div className={styles.formGroup}>
              <label htmlFor="event" className={styles.label}>
                Event <span className={styles.required}>*</span>
              </label>
              <select
                id="event"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                disabled={isUploading || eventsLoading}
                className={styles.select}
                required
              >
                <option value="">Select an event</option>
                {events?.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} — {new Date(event.date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="tags" className={styles.label}>
                Tags (optional)
              </label>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="nature, sunset, portrait (comma-separated)"
                disabled={isUploading}
                className={styles.input}
              />
              <span className={styles.hint}>
                Separate multiple tags with commas
              </span>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="caption" className={styles.label}>
                Caption (optional)
              </label>
              <textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption for this batch..."
                disabled={isUploading}
                className={styles.textarea}
                rows={3}
                maxLength={500}
              />
              <span className={styles.hint}>
                {caption.length} / 500 characters
              </span>
            </div>

            {isUploading && (
              <div className={styles.batchProgress}>
                <div className={styles.progressLabel}>
                  Overall Progress: {batchProgress}%
                </div>
                <div className={styles.batchProgressBar}>
                  <div
                    className={styles.batchProgressFill}
                    style={{ width: `${batchProgress}%` }}
                  />
                </div>
              </div>
            )}

            {failedUploads.length > 0 && (
              <div className={styles.failedUploads} role="alert">
                <h3 className={styles.failedTitle}>Upload Errors</h3>
                <ul className={styles.failedList}>
                  {failedUploads.map((failed) => (
                    <li key={failed.id} className={styles.failedItem}>
                      <strong>{failed.name}:</strong> {failed.error}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleRetryFailed}
                  className={styles.retryButton}
                >
                  Retry Failed Files
                </button>
              </div>
            )}

            <div className={styles.actions}>
              <button
                onClick={handleUpload}
                disabled={isUploading || !selectedEventId}
                className={styles.uploadButton}
              >
                {isUploading ? 'Uploading...' : `Upload ${files.length} Files`}
              </button>

              <button
                onClick={handleClearAll}
                disabled={isUploading}
                className={styles.clearButton}
              >
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
