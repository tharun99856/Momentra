import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiClient } from '../lib/api-client'
import { EventCard } from '../components/events/EventCard'
import MasonryGrid from '../components/gallery/MasonryGrid'

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return null
      const response = await apiClient.get('/api/search', {
        params: { q: debouncedQuery, pageSize: 50 },
      })
      return response.data
    },
    enabled: debouncedQuery.length >= 2,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchParams({ q: query })
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '2rem' }}>
        <form onSubmit={handleSearch}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events and photos..."
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1.125rem',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
            }}
          />
        </form>
      </div>

      {isLoading && <div style={{ textAlign: 'center' }}>Searching...</div>}

      {debouncedQuery.length >= 2 && !isLoading && data && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
          <div>
            <h2>Events</h2>
            {data.events?.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>No events found</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {data.events?.map((event: any) => <EventCard key={event.id} event={event} />)}
              </div>
            )}
          </div>

          <div>
            <h2>Photos</h2>
            {data.media?.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>No photos found</p>
            ) : (
              <MasonryGrid items={data.media || []} onItemClick={() => {}} />
            )}
          </div>
        </div>
      )}

      {debouncedQuery.length < 2 && (
        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          Type at least 2 characters to search
        </div>
      )}
    </div>
  )
}
