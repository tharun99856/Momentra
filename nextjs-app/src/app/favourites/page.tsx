'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import MasonryGrid, { type MediaItem } from '@/components/gallery/MasonryGrid'
import PhotoViewerModal from '@/components/gallery/PhotoViewerModal'
import AuthGuard from '@/components/AuthGuard'
import AppLayout from '@/components/AppLayout'
import styles from './FavouritesPage.module.css'

export default function FavouritesPage() {
  return (
    <AuthGuard>
      <AppLayout>
        <FavouritesContent />
      </AppLayout>
    </AuthGuard>
  )
}

function FavouritesContent() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ['favourites', page],
    queryFn: async () => {
      const res = await apiClient.get('/api/users/me/favourites', { params: { page, pageSize: 24 } })
      return res.data
    },
  })

  const photos: MediaItem[] = data?.items ?? []
  const hasMore = data && page * 24 < data.total

  if (error) return (
    <div className={styles.page}>
      <p className={styles.error}>Failed to load favourites</p>
    </div>
  )

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Favourites</h1>
        <p className={styles.subtitle}>{data?.total ?? 0} saved photos</p>
      </header>

      {isLoading && page === 1 ? (
        <div className={styles.loading}>Loading favourites…</div>
      ) : photos.length === 0 ? (
        <div className={styles.empty}>No favourites yet. Start saving photos you love!</div>
      ) : (
        <>
          <MasonryGrid items={photos} onItemClick={(_item, i) => setSelectedIndex(i)} />
          {hasMore && (
            <div className={styles.loadMore}>
              <button onClick={() => setPage((p) => p + 1)} disabled={isLoading} className={styles.loadMoreButton}>
                {isLoading ? 'Loading…' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}

      {selectedIndex !== null && (
        <PhotoViewerModal media={photos} currentIndex={selectedIndex} onClose={() => setSelectedIndex(null)} onNavigate={setSelectedIndex} />
      )}
    </div>
  )
}
