import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiClient } from '../lib/api-client'
import { useAuthStore } from '../stores/auth.store'
import { EventCard } from '../components/events/EventCard'
import styles from './HomePage.module.css'

export default function HomePage() {
  const user = useAuthStore((s) => s.user)

  const { data, isLoading } = useQuery({
    queryKey: ['recent-events'],
    queryFn: async () => {
      const res = await apiClient.get('/api/events', {
        params: { pageSize: 6, sort: 'date_desc' },
      })
      return res.data
    },
  })

  const events = data?.events ?? []

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.greeting}>
            Hi, {user?.username ?? 'friend'} <em>—</em>
          </h1>
          <p className={styles.greetingMeta}>Your club's recent activity</p>
        </div>
        <div className={styles.headerActions}>
          <Link to="/upload" className={styles.primaryAction}>Upload</Link>
          <Link to="/search" className={styles.secondaryAction}>Search photos</Link>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent events</h2>
          <Link to="/events" className={styles.seeAll}>View all →</Link>
        </div>

        {isLoading ? (
          <div className={styles.grid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className={styles.empty}>No events yet. Upload some photos to get started.</div>
        ) : (
          <div className={styles.grid}>
            {events.map((event: any) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Quick access</h2>
        </div>
        <div className={styles.quickLinks}>
          <Link to="/my-photos" className={styles.quickLink}>
            <span className={styles.quickIcon} aria-hidden="true">◐</span>
            <span>
              Find your photos
              <span className={styles.quickMeta}>AI face recognition</span>
            </span>
          </Link>
          <Link to="/favourites" className={styles.quickLink}>
            <span className={styles.quickIcon} aria-hidden="true">★</span>
            <span>
              Favourites
              <span className={styles.quickMeta}>Photos you've saved</span>
            </span>
          </Link>
          <Link to="/search" className={styles.quickLink}>
            <span className={styles.quickIcon} aria-hidden="true">⌕</span>
            <span>
              Search
              <span className={styles.quickMeta}>By tag, person, or event</span>
            </span>
          </Link>
          <Link to="/notifications" className={styles.quickLink}>
            <span className={styles.quickIcon} aria-hidden="true">◴</span>
            <span>
              Activity
              <span className={styles.quickMeta}>Comments and mentions</span>
            </span>
          </Link>
        </div>
      </section>
    </main>
  )
}
