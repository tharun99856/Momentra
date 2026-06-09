import { useRef, useEffect } from 'react'
import styles from './MasonryGrid.module.css'

export interface MediaItem {
  id: string
  signedUrl: string
  thumbMdUrl: string
  likesCount: number
  liked?: boolean
}

interface MasonryGridProps {
  items: MediaItem[]
  onItemClick: (item: MediaItem, index: number) => void
  onLikeToggle?: (mediaId: string) => void
  onLoadMore?: () => void
  hasMore?: boolean
  isLoading?: boolean
}

export default function MasonryGrid({
  items,
  onItemClick,
  onLikeToggle,
  onLoadMore,
  hasMore = false,
  isLoading = false,
}: MasonryGridProps): React.JSX.Element {
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Infinite scroll observer
  useEffect(() => {
    if (!onLoadMore || !hasMore || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore()
        }
      },
      { threshold: 0.1 }
    )

    const sentinel = sentinelRef.current
    if (sentinel) {
      observer.observe(sentinel)
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel)
      }
    }
  }, [onLoadMore, hasMore, isLoading])

  const handleLikeClick = (e: React.MouseEvent, mediaId: string): void => {
    e.stopPropagation()
    onLikeToggle?.(mediaId)
  }

  return (
    <>
      <div className={styles.masonry}>
        {items.map((item, index) => (
          <div
            key={item.id}
            className={styles.masonryItem}
            onClick={() => {
              onItemClick(item, index)
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onItemClick(item, index)
              }
            }}
          >
            <img
              src={item.thumbMdUrl}
              alt=""
              className={styles.masonryImage}
              loading="lazy"
            />
            <div className={styles.masonryOverlay}>
              <button
                type="button"
                className={styles.likeButton}
                onClick={(e) => {
                  handleLikeClick(e, item.id)
                }}
                aria-label={item.liked ? 'Unlike photo' : 'Like photo'}
              >
                <span className={`${styles.likeIcon} ${item.liked ? styles.liked : ''}`}>
                  {item.liked ? '❤️' : '🤍'}
                </span>
                <span>{item.likesCount}</span>
              </button>
            </div>
          </div>
        ))}

        {/* Loading skeleton */}
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={`skeleton-${i}`} className={styles.skeleton} />
          ))}
      </div>

      {/* Infinite scroll sentinel */}
      {hasMore && <div ref={sentinelRef} style={{ height: '20px' }} />}
    </>
  )
}
