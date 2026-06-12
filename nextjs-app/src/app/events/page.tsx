'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { EventCard, EventCardSkeleton } from '@/components/events/EventCard'
import AuthGuard from '@/components/AuthGuard'
import AppLayout from '@/components/AppLayout'
import styles from './EventsPage.module.css'

const CATEGORIES = ['cultural','sports','workshop','trip','party','hackathon','other'] as const

export default function EventsPage() {
  return (
    <AuthGuard>
      <AppLayout>
        <EventsContent />
      </AppLayout>
    </AuthGuard>
  )
}

function EventsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(searchParams.getAll('category'))
  const [selectedVisibility, setSelectedVisibility] = useState(searchParams.get('visibility') ?? 'all')
  const [selectedSort, setSelectedSort] = useState(searchParams.get('sort') ?? 'date_desc')
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') ?? '')
  const [dateTo, setDateTo] = useState(searchParams.get('to') ?? '')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['events', page, selectedCategories, selectedVisibility, selectedSort, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('pageSize', '20')
      params.set('sort', selectedSort)
      selectedCategories.forEach((c) => params.append('category', c))
      if (selectedVisibility !== 'all') params.set('visibility', selectedVisibility)
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      const res = await apiClient.get(`/api/events?${params.toString()}`)
      return res.data
    },
  })

  function updateParams(updates: Record<string, string | string[]>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => {
      params.delete(k)
      if (Array.isArray(v)) v.forEach((val) => params.append(k, val))
      else if (v) params.set(k, v)
    })
    router.push(`${pathname}?${params.toString()}`)
  }

  const toggleCategory = (cat: string) => {
    const next = selectedCategories.includes(cat) ? selectedCategories.filter((c) => c !== cat) : [...selectedCategories, cat]
    setSelectedCategories(next)
    updateParams({ category: next, page: '1' })
  }

  const hasFilters = selectedCategories.length > 0 || selectedVisibility !== 'all' || !!dateFrom || !!dateTo
  const totalPages = data ? Math.ceil(data.total / 20) : 0

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Events</h1>
          <p className={styles.subtitle}>Browse and discover events from your clubs</p>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterSection}>
          <label className={styles.filterLabel}>Categories</label>
          <div className={styles.categoryChips}>
            {CATEGORIES.map((cat) => (
              <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                className={`${styles.chip} ${selectedCategories.includes(cat) ? styles.chipActive : ''}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterSection}>
          <label className={styles.filterLabel}>Date Range</label>
          <div className={styles.dateInputs}>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); updateParams({ from: e.target.value, page: '1' }) }} className={styles.dateInput} aria-label="From date" />
            <span className={styles.dateSeparator}>to</span>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); updateParams({ to: e.target.value, page: '1' }) }} className={styles.dateInput} aria-label="To date" />
          </div>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label htmlFor="vis" className={styles.filterLabel}>Visibility</label>
            <select id="vis" value={selectedVisibility} onChange={(e) => { setSelectedVisibility(e.target.value); updateParams({ visibility: e.target.value, page: '1' }) }} className={styles.select}>
              <option value="all">All Events</option>
              <option value="public">Public Only</option>
              <option value="private">Private Only</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="sort" className={styles.filterLabel}>Sort</label>
            <select id="sort" value={selectedSort} onChange={(e) => { setSelectedSort(e.target.value); updateParams({ sort: e.target.value, page: '1' }) }} className={styles.select}>
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="name_asc">Name A-Z</option>
            </select>
          </div>
          {hasFilters && (
            <button type="button" className={styles.clearButton} onClick={() => {
              setSelectedCategories([]); setSelectedVisibility('all'); setSelectedSort('date_desc'); setDateFrom(''); setDateTo('')
              router.push(pathname)
            }}>Clear Filters</button>
          )}
        </div>
      </div>

      {isError && <div className={styles.error}><p>Failed to load events.</p></div>}
      {isLoading && <div className={styles.grid}>{Array.from({ length: 8 }).map((_, i) => <EventCardSkeleton key={i} />)}</div>}

      {data && data.events.length > 0 && (
        <>
          <div className={styles.grid}>
            {data.events.map((event: any) => <EventCard key={event.id} event={event} />)}
          </div>
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button type="button" onClick={() => updateParams({ page: String(page - 1) })} disabled={page === 1} className={styles.paginationButton}>← Previous</button>
              <span className={styles.pageIndicator}>Page {page} of {totalPages}</span>
              <button type="button" onClick={() => updateParams({ page: String(page + 1) })} disabled={page >= totalPages} className={styles.paginationButton}>Next →</button>
            </div>
          )}
        </>
      )}

      {data && data.events.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📅</div>
          <h2 className={styles.emptyTitle}>{hasFilters ? 'No events match your filters' : 'No events yet'}</h2>
          <p className={styles.emptyText}>{hasFilters ? 'Try adjusting your filters' : 'Events will appear here once created'}</p>
        </div>
      )}
    </main>
  )
}
