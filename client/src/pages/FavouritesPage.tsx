import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import MasonryGrid from '../components/gallery/MasonryGrid'
import PhotoViewerModal from '../components/gallery/PhotoViewerModal'
import { apiClient } from '../lib/api-client'

export function FavouritesPage() {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ['favourites', page],
    queryFn: async () => {
      const response = await apiClient.get('/api/users/me/favourites', {
        params: { page, pageSize: 24 },
      })
      return response.data
    },
  })

  const photos = data?.items ?? []
  const hasMore = data && page * 24 < data.total

  const handlePhotoClick = (index: number) => {
    setSelectedPhotoIndex(index)
  }

  const handleCloseModal = () => {
    setSelectedPhotoIndex(null)
  }

  const loadMore = () => {
    if (hasMore) {
      setPage((prev) => prev + 1)
    }
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Failed to load favourites</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1>Favourites</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            {data?.total ?? 0} saved photos
          </p>
        </header>

        {isLoading && page === 1 ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <p>Loading favourites...</p>
          </div>
        ) : photos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              No favourites yet. Start saving photos you love!
            </p>
          </div>
        ) : (
          <>
            <MasonryGrid 
              items={photos} 
              onItemClick={(_item, index) => handlePhotoClick(index)}
            />

            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  style={{
                    padding: '0.75rem 2rem',
                    fontSize: '1rem',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}

        {selectedPhotoIndex !== null && (
          <PhotoViewerModal
            media={photos}
            currentIndex={selectedPhotoIndex}
            onClose={handleCloseModal}
            onNavigate={(index) => setSelectedPhotoIndex(index)}
          />
        )}
      </div>
    </div>
  )
}
