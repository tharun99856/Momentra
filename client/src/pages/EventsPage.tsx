import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { EventCard, EventCardSkeleton } from '../components/events/EventCard'
import styles from './EventsPage.module.css'

const CATEGORIES = [
  'cultural',
  'sports',
  'workshop',
  'trip',
  'party',
  'hackathon',
  'other',
] as const

type EventCategory = (typeof CATEGORIES)[number]

interface Event {
  id: string
  name: string
  date: string
  category: EventCategory
  coverPhotoUrl: string | null
  mediaCount: number
  visibility: 'public' | 'private'
}

interface EventsResponse {
  events: Event[]
  total: number
  page: number
  pageSize: number
}

export default function EventsPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()

  // Extract filters from URL
  const page = parseInt(searchParams.get('page') || '1', 10)
  const category = searchParams.getAll('category')
  const visibility = searchParams.get('visibility') || 'all'
  const sort = searchParams.get('sort') || 'date_desc'
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''

  // Local filter state (synced to URL)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(category)
  const [selectedVisibility, setSelectedVisibility] = useState(visibility)
  const [selectedSort, setSelectedSort] = useState(sort)
  const [dateFrom, setDateFrom] = useState(from)
  const [dateTo, setDateTo] = useState(to)

  // Fetch events
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['events', page, selectedCategories, selectedVisibility, selectedSort, dateFrom, dateTo],
    queryFn: async (): Promise<EventsResponse> => {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('pageSize', '20')
      params.set('sort', selectedSort)

      if (selectedCategories.length > 0) {
        selectedCategories.forEach((cat) => {
          params.append('category', cat)
        })
      }

      if (selectedVisibility !== 'all') {
        params.set('visibility', selectedVisibility)
      }

      if (dateFrom) {
        params.set('from', dateFrom)
      }

      if (dateTo) {
        params.set('to', dateTo)
      }

      const response = await apiClient.get<EventsResponse>(`/api/events?${params.toString()}`)
      return response.data
    },
  })

  // Sync local state to URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('sort', selectedSort)
    params.set('visibility', selectedVisibility)

    if (selectedCategories.length > 0) {
      selectedCategories.forEach((cat) => {
        params.append('category', cat)
      })
    }

    if (dateFrom) {
      params.set('from', dateFrom)
    }

    if (dateTo) {
      params.set('to', dateTo)
    }

    setSearchParams(params, { replace: true })
  }, [page, selectedCategories, selectedVisibility, selectedSort, dateFrom, dateTo, setSearchParams])

  const handleCategoryToggle = (cat: string): void => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
    // Reset to page 1 when filters change
    setSearchParams((prev) => {
      prev.set('page', '1')
      return prev
    })
  }

  const handleVisibilityChange = (vis: string): void => {
    setSelectedVisibility(vis)
    setSearchParams((prev) => {
      prev.set('page', '1')
      return prev
    })
  }

  const handleSortChange = (newSort: string): void => {
    setSelectedSort(newSort)
    setSearchParams((prev) => {
      prev.set('page', '1')
      return prev
    })
  }

  const handlePageChange = (newPage: number): void => {
    setSearchParams((prev) => {
      prev.set('page', newPage.toString())
      return prev
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleClearFilters = (): void => {
    setSelectedCategories([])
    setSelectedVisibility('all')
    setSelectedSort('date_desc')
    setDateFrom('')
    setDateTo('')
    setSearchParams({})
  }

  const hasFilters =
    selectedCategories.length > 0 ||
    selectedVisibility !== 'all' ||
    dateFrom !== '' ||
    dateTo !== ''

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Events</h1>
        <p className={styles.subtitle}>
          Browse and discover events from your clubs
        </p>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterSection}>
          <label className={styles.filterLabel}>Categories</label>
          <div className={styles.categoryChips}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  handleCategoryToggle(cat)
                }}
                className={`${styles.chip} ${
                  selectedCategories.includes(cat) ? styles.chipActive : ''
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterSection}>
          <label className={styles.filterLabel}>Date Range</label>
          <div className={styles.dateInputs}>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
              }}
              className={styles.dateInput}
              placeholder="From"
              aria-label="From date"
            />
            <span className={styles.dateSeparator}>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
              }}
              className={styles.dateInput}
              placeholder="To"
              aria-label="To date"
            />
          </div>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label htmlFor="visibility-select" className={styles.filterLabel}>
              Visibility
            </label>
            <select
              id="visibility-select"
              value={selectedVisibility}
              onChange={(e) => {
                handleVisibilityChange(e.target.value)
              }}
              className={styles.select}
            >
              <option value="all">All Events</option>
              <option value="public">Public Only</option>
              <option value="private">Private Only</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="sort-select" className={styles.filterLabel}>
              Sort By
            </label>
            <select
              id="sort-select"
              value={selectedSort}
              onChange={(e) => {
                handleSortChange(e.target.value)
              }}
              className={styles.select}
            >
              <option value="date_desc">Date (Newest First)</option>
              <option value="date_asc">Date (Oldest First)</option>
              <option value="name_asc">Name (A-Z)</option>
            </select>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className={styles.clearButton}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Events Grid */}
      {isError && (
        <div className={styles.error}>
          <p>Failed to load events. Please try again.</p>
          {error instanceof Error && (
            <p className={styles.errorDetails}>{error.message}</p>
          )}
        </div>
      )}

      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      )}

      {data && data.events.length > 0 && (
        <>
          <div className={styles.grid}>
            {data.events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                onClick={() => {
                  handlePageChange(page - 1)
                }}
                disabled={page === 1}
                className={styles.paginationButton}
                aria-label="Previous page"
              >
                ← Previous
              </button>
              <span className={styles.pageIndicator}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => {
                  handlePageChange(page + 1)
                }}
                disabled={page === totalPages}
                className={styles.paginationButton}
                aria-label="Next page"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {data !== undefined && data.events.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📅</div>
          <h2 className={styles.emptyTitle}>
            {hasFilters ? 'No events match your filters' : 'No events yet'}
          </h2>
          <p className={styles.emptyText}>
            {hasFilters
              ? 'Try adjusting your filters to see more events'
              : 'Events will appear here once they are created'}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className={styles.emptyButton}
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </main>
  )
}
