'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { EventCard } from '@/components/events/EventCard'
import MasonryGrid from '@/components/gallery/MasonryGrid'
import AuthGuard from '@/components/AuthGuard'
import AppLayout from '@/components/AppLayout'
import styles from './SearchPage.module.css'

export default function SearchPage() {
  return (
    <AuthGuard>
      <AppLayout>
        <SearchContent />
      </AppLayout>
    </AuthGuard>
  )
}

function SearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return null
      const res = await apiClient.get('/api/search', { params: { q: debouncedQuery, pageSize: 50 } })
      return res.data
    },
    enabled: debouncedQuery.length >= 2,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.searchBar}>
        <form onSubmit={handleSearch}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events and photos…"
            className={styles.input}
            autoFocus
          />
        </form>
      </div>

      {isLoading && <div className={styles.status}>Searching…</div>}

      {debouncedQuery.length >= 2 && !isLoading && data && (
        <div className={styles.results}>
          <div className={styles.eventsCol}>
            <h2 className={styles.colTitle}>Events</h2>
            {data.events?.length === 0
              ? <p className={styles.empty}>No events found</p>
              : <div className={styles.eventsList}>{data.events?.map((ev: any) => <EventCard key={ev.id} event={ev} />)}</div>}
          </div>
          <div className={styles.photosCol}>
            <h2 className={styles.colTitle}>Photos</h2>
            {data.media?.length === 0
              ? <p className={styles.empty}>No photos found</p>
              : <MasonryGrid items={data.media ?? []} onItemClick={() => {}} />}
          </div>
        </div>
      )}

      {debouncedQuery.length < 2 && (
        <div className={styles.status}>Type at least 2 characters to search</div>
      )}
    </div>
  )
}
