import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiClient } from '../lib/api-client'
import { useAuthStore } from '../stores/auth.store'
import { EventCard } from '../components/events/EventCard'
import styles from './DashboardPage.module.css'

interface DashboardStats {
  totalEvents: number
  totalPhotos: number
  totalMembers: number
  storageUsedMB: number
  storageLimitMB: number
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['recent-events'],
    queryFn: async () => {
      const res = await apiClient.get('/api/events', {
        params: { pageSize: 6, sort: 'date_desc' },
      })
      return res.data
    },
  })

  const { data: wsStats } = useQuery({
    queryKey: ['workspace-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/api/workspace/stats')
      return res.data as DashboardStats
    },
  })

  const events = eventsData?.events ?? []

  const stats: DashboardStats = wsStats ?? {
    totalEvents: eventsData?.total ?? 0,
    totalPhotos: events.reduce((acc: number, e: any) => acc + (e.mediaCount || 0), 0),
    totalMembers: 1,
    storageUsedMB: 0,
    storageLimitMB: 5120,
  }

  const storagePercent = stats.storageLimitMB > 0
    ? Math.min(100, Math.round((stats.storageUsedMB / stats.storageLimitMB) * 100))
    : 0

  const timeGreeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <main className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <p className={styles.greeting}>{timeGreeting},</p>
          <h1 className={styles.userName}>{user?.username ?? 'there'}</h1>
        </div>
        <div className={styles.headerActions}>
          <Link to="/upload" className={styles.primaryBtn}>
            <span aria-hidden="true">↑</span>
            Upload photos
          </Link>
        </div>
      </header>

      {/* Stats Grid */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>◇</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.totalEvents}</span>
            <span className={styles.statLabel}>Total Events</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>◐</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.totalPhotos}</span>
            <span className={styles.statLabel}>Photos Uploaded</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>◯</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.totalMembers}</span>
            <span className={styles.statLabel}>Team Members</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>⊡</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.storageUsedMB < 1024 ? `${stats.storageUsedMB} MB` : `${(stats.storageUsedMB / 1024).toFixed(1)} GB`}</span>
            <span className={styles.statLabel}>Storage Used</span>
          </div>
          <div className={styles.storageBar}>
            <div className={styles.storageFill} style={{ width: `${storagePercent}%` }} />
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick actions</h2>
        <div className={styles.quickGrid}>
          <Link to="/events" className={styles.quickCard}>
            <span className={styles.quickIcon}>◇</span>
            <div>
              <span className={styles.quickLabel}>Browse Events</span>
              <span className={styles.quickMeta}>View all events and galleries</span>
            </div>
          </Link>
          <Link to="/my-photos" className={styles.quickCard}>
            <span className={styles.quickIcon}>◐</span>
            <div>
              <span className={styles.quickLabel}>Find My Photos</span>
              <span className={styles.quickMeta}>AI-powered face recognition</span>
            </div>
          </Link>
          <Link to="/search" className={styles.quickCard}>
            <span className={styles.quickIcon}>⌕</span>
            <div>
              <span className={styles.quickLabel}>Search</span>
              <span className={styles.quickMeta}>By tag, person, or event</span>
            </div>
          </Link>
          <Link to="/settings" className={styles.quickCard}>
            <span className={styles.quickIcon}>⚙</span>
            <div>
              <span className={styles.quickLabel}>Workspace Settings</span>
              <span className={styles.quickMeta}>Team, billing, and more</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Recent Events */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent events</h2>
          <Link to="/events" className={styles.seeAll}>View all →</Link>
        </div>
        {eventsLoading ? (
          <div className={styles.eventsGrid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>◇</div>
            <h3 className={styles.emptyTitle}>No events yet</h3>
            <p className={styles.emptyDesc}>Create your first event to start uploading photos.</p>
          </div>
        ) : (
          <div className={styles.eventsGrid}>
            {events.map((event: any) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* Plan Banner */}
      <section className={styles.planBanner}>
        <div className={styles.planInfo}>
          <h3 className={styles.planTitle}>Starter Plan</h3>
          <p className={styles.planDesc}>
            You're on the free plan. Upgrade to Pro for unlimited events, AI face recognition, and advanced analytics.
          </p>
        </div>
        <Link to="/settings" className={styles.upgradeBtn}>Upgrade to Pro</Link>
      </section>
    </main>
  )
}
