'use client'

import { useEffect, useCallback, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import LikeButton from '../social/LikeButton'
import CommentThread from '../social/CommentThread'
import styles from './PhotoViewerModal.module.css'
import type { MediaItem } from './MasonryGrid'

interface PhotoViewerModalProps {
  media: MediaItem[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export default function PhotoViewerModal({ media, currentIndex, onClose, onNavigate }: PhotoViewerModalProps) {
  const currentMedia = media[currentIndex]
  const queryClient = useQueryClient()
  const [isSaved, setIsSaved] = useState(false)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < media.length - 1

  const favouriteMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      const { data } = await apiClient.post<{ saved: boolean }>(`/api/media/${mediaId}/favourites`)
      return data
    },
    onSuccess: (data) => {
      setIsSaved(data.saved)
      void queryClient.invalidateQueries({ queryKey: ['favourites'] })
    },
  })

  useEffect(() => { setIsSaved(false) }, [currentMedia?.id])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1)
      else if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [currentIndex, hasPrev, hasNext, onClose, onNavigate])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  if (!currentMedia) { onClose(); return null }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Photo viewer">
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close photo viewer">✕</button>

        <div className={styles.imageContainer}>
          <img src={currentMedia.signedUrl ?? ''} alt="" className={styles.image} loading="eager" />
          <button type="button" className={`${styles.navButton} ${styles.navButtonPrev}`} onClick={() => onNavigate(currentIndex - 1)} disabled={!hasPrev} aria-label="Previous photo">‹</button>
          <button type="button" className={`${styles.navButton} ${styles.navButtonNext}`} onClick={() => onNavigate(currentIndex + 1)} disabled={!hasNext} aria-label="Next photo">›</button>
        </div>

        <div className={styles.details}>
          <div className={styles.detailsHeader}>
            <div className={styles.uploader}>
              <div className={styles.uploaderAvatar} />
              <div className={styles.uploaderInfo}>
                <p className={styles.uploaderName}>Photographer</p>
                <p className={styles.uploadDate}>Just now</p>
              </div>
            </div>
            <div className={styles.actions}>
              <LikeButton mediaId={currentMedia.id} initialLiked={currentMedia.liked ?? false} initialCount={currentMedia.likesCount} size="large" />
              <button
                type="button"
                className={`${styles.actionButton} ${isSaved ? styles.actionButtonActive : ''}`}
                onClick={() => favouriteMutation.mutate(currentMedia.id)}
                disabled={favouriteMutation.isPending}
                aria-label={isSaved ? 'Remove from favourites' : 'Add to favourites'}
              >{isSaved ? '🔖' : '📑'}</button>
              <a
                href={`/api/media/${currentMedia.id}/download`}
                className={styles.actionButton}
                aria-label="Download photo"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
              >⬇️</a>
            </div>
          </div>
          <div className={styles.commentSection}>
            <CommentThread mediaId={currentMedia.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
