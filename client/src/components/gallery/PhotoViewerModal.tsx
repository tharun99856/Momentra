import { useEffect, useCallback, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'
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

export default function PhotoViewerModal({
  media,
  currentIndex,
  onClose,
  onNavigate,
}: PhotoViewerModalProps): React.JSX.Element {
  const currentMedia = media[currentIndex]
  const queryClient = useQueryClient()

  // Track favourite state locally
  const [isSaved, setIsSaved] = useState(false)

  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < media.length - 1

  // Favourite mutation
  const favouriteMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      const { data } = await apiClient.post<{ saved: boolean }>(
        `/api/media/${mediaId}/favourites`
      )
      return data
    },
    onSuccess: (data) => {
      setIsSaved(data.saved)
      // Invalidate favourites list
      queryClient.invalidateQueries({ queryKey: ['favourites'] })
    },
  })

  // Reset saved state when media changes
  useEffect(() => {
    // TODO: In a real implementation, we'd fetch the initial saved state
    // For now, we'll assume it's false
    setIsSaved(false)
  }, [currentMedia?.id])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && hasPrev) {
        onNavigate(currentIndex - 1)
      } else if (e.key === 'ArrowRight' && hasNext) {
        onNavigate(currentIndex + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentIndex, hasPrev, hasNext, onClose, onNavigate])

  // Focus trap
  useEffect(() => {
    const modal = document.querySelector('[role="dialog"]') as HTMLElement
    if (!modal) return

    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTabKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement?.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }

    modal.addEventListener('keydown', handleTabKey)
    firstElement?.focus()

    return () => {
      modal.removeEventListener('keydown', handleTabKey)
    }
  }, [currentIndex])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    },
    [onClose]
  )

  const handlePrevClick = (): void => {
    if (hasPrev) {
      onNavigate(currentIndex - 1)
    }
  }

  const handleNextClick = (): void => {
    if (hasNext) {
      onNavigate(currentIndex + 1)
    }
  }

  const handleToggleFavourite = (): void => {
    if (currentMedia?.id) {
      favouriteMutation.mutate(currentMedia.id)
    }
  }

  if (!currentMedia) {
    onClose()
    return <></>
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Photo viewer">
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close photo viewer"
        >
          ✕
        </button>

        <div className={styles.imageContainer}>
          <img
            src={currentMedia.signedUrl}
            alt=""
            className={styles.image}
            loading="eager"
          />

          <button
            type="button"
            className={`${styles.navButton} ${styles.navButtonPrev}`}
            onClick={handlePrevClick}
            disabled={!hasPrev}
            aria-label="Previous photo"
          >
            ‹
          </button>

          <button
            type="button"
            className={`${styles.navButton} ${styles.navButtonNext}`}
            onClick={handleNextClick}
            disabled={!hasNext}
            aria-label="Next photo"
          >
            ›
          </button>
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
              <LikeButton
                mediaId={currentMedia.id}
                initialLiked={currentMedia.liked ?? false}
                initialCount={currentMedia.likesCount}
                size="large"
              />
              <button
                type="button"
                className={`${styles.actionButton} ${isSaved ? styles.actionButtonActive : ''}`}
                onClick={handleToggleFavourite}
                disabled={favouriteMutation.isPending}
                aria-label={isSaved ? 'Remove from favourites' : 'Add to favourites'}
              >
                {isSaved ? '🔖' : '📑'}
              </button>
              <button
                type="button"
                className={styles.actionButton}
                aria-label="Download photo"
              >
                ⬇️
              </button>
              <button
                type="button"
                className={styles.actionButton}
                aria-label="Share photo"
              >
                🔗
              </button>
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
