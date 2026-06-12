'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import MasonryGrid, { type MediaItem } from '@/components/gallery/MasonryGrid'
import PhotoViewerModal from '@/components/gallery/PhotoViewerModal'
import AuthGuard from '@/components/AuthGuard'
import AppLayout from '@/components/AppLayout'
import styles from './EventDetailPage.module.css'

export default function EventDetailPage() {
  return (
    <AuthGuard>
      <AppLayout>
        <EventDetailContent />
      </AppLayout>
    </AuthGuard>
  )
}

function EventDetailContent() {
  const { id: eventId } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<'gallery' | 'people' | 'highlights'>('gallery')
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const { data: event, isLoading: isLoadingEvent, error: eventError } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => { const { data } = await apiClient.get(`/api/events/${eventId}`); return data },
    enabled: !!eventId,
  })

  const { data: mediaPages, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: isLoadingMedia } = useInfiniteQuery({
    queryKey: ['event-media', eventId],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await apiClient.get(`/api/events/${eventId}/media`, { params: { page: pageParam, pageSize: 50 } })
      return data
    },
    getNextPageParam: (last: any) => last.pagination.hasMore ? last.pagination.page + 1 : undefined,
    enabled: !!eventId && activeTab === 'gallery',
    initialPageParam: 1,
  })

  const allMedia: MediaItem[] = mediaPages?.pages.flatMap((p: any) => p.data) ?? []

  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage || isFetchingNextPage) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) void fetchNextPage() },
      { threshold: 0.1 }
    )
    const el = sentinelRef.current
    observer.observe(el)
    return () => observer.unobserve(el)
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  if (isLoadingEvent) return <main><div className={styles.loading}>Loading event…</div></main>
  if (eventError || !event) return (
    <main><div className={styles.error}>
      <h1 className={styles.errorTitle}>Event Not Found</h1>
      <p className={styles.errorMessage}>This event doesn&apos;t exist or you don&apos;t have access.</p>
    </div></main>
  )

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <main>
      <div className={styles.coverArea}>
        {event.coverPhotoUrl && <img src={event.coverPhotoUrl} alt="" className={styles.coverImage} />}
        <div className={styles.coverOverlay}>
          <div className={styles.coverContent}>
            <h1 className={styles.eventName}>{event.name}</h1>
            <div className={styles.eventMeta}>
              <div className={styles.metaItem}><span>📅</span><span>{formatDate(event.date)}</span></div>
              {event.location && <div className={styles.metaItem}><span>📍</span><span>{event.location}</span></div>}
              <div className={styles.categoryBadge}>{event.category}</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.metadataRow}>
        <div className={styles.statItem}><span>📷</span><span>{event._count?.media ?? 0} photos</span></div>
        <div className={`${styles.visibilityBadge} ${event.visibility === 'public' ? styles.public : styles.private}`}>
          {event.visibility === 'public' ? '🌐 Public' : '🔒 Private'}
        </div>
      </div>

      <div className={styles.tabsContainer}>
        <div role="tablist" className={styles.tabsList}>
          {(['gallery','people','highlights'] as const).map((tab) => (
            <button key={tab} type="button" role="tab" aria-selected={activeTab === tab}
              className={styles.tab} onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel" className={styles.tabPanel} hidden={activeTab !== 'gallery'}>
        {isLoadingMedia ? <div className={styles.loading}>Loading photos…</div>
          : allMedia.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📷</div>
              <h2 className={styles.emptyTitle}>No photos yet</h2>
              <p className={styles.emptyText}>Photos will appear here once uploaded.</p>
            </div>
          ) : (
            <>
              <MasonryGrid items={allMedia} onItemClick={(_item, i) => setSelectedPhotoIndex(i)} />
              {hasNextPage && <div ref={sentinelRef} className={styles.scrollSentinel} />}
            </>
          )}
      </div>

      <div role="tabpanel" className={styles.tabPanel} hidden={activeTab !== 'people'}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>👥</div>
          <h2 className={styles.emptyTitle}>No people recognized</h2>
          <p className={styles.emptyText}>Face recognition results will appear here.</p>
        </div>
      </div>

      <div role="tabpanel" className={styles.tabPanel} hidden={activeTab !== 'highlights'}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⭐</div>
          <h2 className={styles.emptyTitle}>No highlights yet</h2>
          <p className={styles.emptyText}>Top-liked photos will appear here.</p>
        </div>
      </div>

      {selectedPhotoIndex !== null && (
        <PhotoViewerModal media={allMedia} currentIndex={selectedPhotoIndex} onClose={() => setSelectedPhotoIndex(null)} onNavigate={setSelectedPhotoIndex} />
      )}
    </main>
  )
}
