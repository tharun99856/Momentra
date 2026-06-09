import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import MasonryGrid from '../components/gallery/MasonryGrid'
import PhotoViewerModal from '../components/gallery/PhotoViewerModal'
import type { MediaItem } from '../components/gallery/MasonryGrid'
import styles from './EventDetailPage.module.css'

interface Event {
  id: string
  name: string
  description: string | null
  category: string
  date: string
  location: string | null
  visibility: 'public' | 'private'
  coverPhotoId: string | null
  coverPhotoUrl: string | null
  clubId: string
  clubName: string
  createdBy: string
  createdAt: string
  updatedAt: string
  _count: {
    media: number
  }
}

interface MediaResponse {
  data: MediaItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    hasMore: boolean
  }
}

type TabId = 'gallery' | 'people' | 'highlights'

export default function EventDetailPage(): React.JSX.Element {
  const { id: eventId } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<TabId>('gallery')
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Determine page size based on screen width
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
  const pageSize = isMobile ? 24 : 50

  // Fetch event details
  const {
    data: event,
    isLoading: isLoadingEvent,
    error: eventError,
  } = useQuery<Event>({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/events/${eventId}`)
      return data
    },
    enabled: !!eventId,
  })

  // Fetch media with infinite scroll
  const {
    data: mediaPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMedia,
  } = useInfiniteQuery<MediaResponse>({
    queryKey: ['event-media', eventId, pageSize],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await apiClient.get(`/api/events/${eventId}/media`, {
        params: { page: pageParam, pageSize },
      })
      return data
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined
    },
    enabled: !!eventId && activeTab === 'gallery',
    initialPageParam: 1,
  })

  // Flatten all media items from pages
  const allMedia: MediaItem[] = mediaPages?.pages.flatMap((page) => page.data) ?? []

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    const sentinel = sentinelRef.current
    observer.observe(sentinel)

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel)
      }
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const handlePhotoClick = (_item: MediaItem, index: number): void => {
    setSelectedPhotoIndex(index)
  }

  const handleCloseModal = (): void => {
    setSelectedPhotoIndex(null)
  }

  const handleNavigatePhoto = (index: number): void => {
    setSelectedPhotoIndex(index)
  }

  const handleLikeToggle = async (mediaId: string): Promise<void> => {
    try {
      await apiClient.post(`/api/media/${mediaId}/likes`)
      // TODO: Optimistic update or refetch
    } catch (error) {
      console.error('Failed to toggle like:', error)
    }
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (isLoadingEvent) {
    return (
      <main>
        <div className={styles.loading}>Loading event details...</div>
      </main>
    )
  }

  if (eventError || !event) {
    return (
      <main>
        <div className={styles.error}>
          <h1 className={styles.errorTitle}>Event Not Found</h1>
          <p className={styles.errorMessage}>
            The event you're looking for doesn't exist or you don't have access to it.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main>
      {/* Cover Area */}
      <div className={styles.coverArea}>
        {event.coverPhotoUrl && (
          <img src={event.coverPhotoUrl} alt="" className={styles.coverImage} />
        )}
        <div className={styles.coverOverlay}>
          <div className={styles.coverContent}>
            <h1 className={styles.eventName}>{event.name}</h1>
            <div className={styles.eventMeta}>
              <div className={styles.metaItem}>
                <span>📅</span>
                <span>{formatDate(event.date)}</span>
              </div>
              {event.location && (
                <div className={styles.metaItem}>
                  <span>📍</span>
                  <span>{event.location}</span>
                </div>
              )}
              <div className={styles.categoryBadge}>{event.category}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata Row */}
      <div className={styles.metadataRow}>
        <div className={styles.organizerAvatars}>
          <div className={styles.avatarPlaceholder}>👤</div>
        </div>
        <div className={styles.statItem}>
          <span>📷</span>
          <span>{event._count.media} photos</span>
        </div>
        <div className={styles.statItem}>
          <span>👥</span>
          <span>0 participants</span>
        </div>
        <div
          className={`${styles.visibilityBadge} ${event.visibility === 'public' ? styles.public : styles.private}`}
        >
          {event.visibility === 'public' ? '🌐 Public' : '🔒 Private'}
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <div role="tablist" className={styles.tabsList}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'gallery'}
            className={styles.tab}
            onClick={() => {
              setActiveTab('gallery')
            }}
          >
            Gallery
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'people'}
            className={styles.tab}
            onClick={() => {
              setActiveTab('people')
            }}
          >
            People
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'highlights'}
            className={styles.tab}
            onClick={() => {
              setActiveTab('highlights')
            }}
          >
            Highlights
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div role="tabpanel" className={styles.tabPanel} hidden={activeTab !== 'gallery'}>
        {isLoadingMedia ? (
          <div className={styles.loading}>Loading photos...</div>
        ) : allMedia.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📷</div>
            <h2 className={styles.emptyTitle}>No photos yet</h2>
            <p className={styles.emptyText}>
              Photos from this event will appear here once they're uploaded.
            </p>
          </div>
        ) : (
          <>
            <MasonryGrid
              items={allMedia}
              onItemClick={handlePhotoClick}
              onLikeToggle={handleLikeToggle}
            />
            {hasNextPage && <div ref={sentinelRef} className={styles.scrollSentinel} />}
          </>
        )}
      </div>

      <div role="tabpanel" className={styles.tabPanel} hidden={activeTab !== 'people'}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>👥</div>
          <h2 className={styles.emptyTitle}>No people recognized</h2>
          <p className={styles.emptyText}>
            Face recognition results will appear here once photos are processed.
          </p>
        </div>
      </div>

      <div role="tabpanel" className={styles.tabPanel} hidden={activeTab !== 'highlights'}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⭐</div>
          <h2 className={styles.emptyTitle}>No highlights yet</h2>
          <p className={styles.emptyText}>
            Top-liked photos from this event will appear here.
          </p>
        </div>
      </div>

      {/* Photo Viewer Modal */}
      {selectedPhotoIndex !== null && (
        <PhotoViewerModal
          media={allMedia}
          currentIndex={selectedPhotoIndex}
          onClose={handleCloseModal}
          onNavigate={handleNavigatePhoto}
        />
      )}
    </main>
  )
}

