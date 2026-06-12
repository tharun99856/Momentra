'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth.store'
import { EventCard } from '@/components/events/EventCard'
import AuthGuard from '@/components/AuthGuard'
import AppLayout from '@/components/AppLayout'
import styles from './DashboardPage.module.css'

export default function DashboardRoute() {
  return (
    <AuthGuard>
      <AppLayout>
        <DashboardContent />
      </AppLayout>
    </AuthGuard>
  )
}

function DashboardContent() {
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

  const events = eventsData?.events ?? []
  const totalEvents = eventsData?.total ?? 0
  const totalPhotos = events.reduce((acc: number, e: any) => acc + (e.mediaCount || 0), 0)

  const storagePercent = 0

  const timeGreeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.greeting}>{timeGreeting},</p>
          <h1 className={styles.userName}>{user?.username ?? 'there'}</h1>
        </div>
        <div className={styles.headerActions}>
          <Link href="/upload" className={styles.primaryBtn}><span aria-hidden="true">↑</span> Upload photos</Link>
        </div>
      </header>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>◇</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{totalEvents}</span>
            <span className={styles.statLabel}>Total Events</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>◐</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{totalPhotos}</span>
            <span className={styles.statLabel}>Photos Uploaded</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>◯</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>1</span>
            <span className={styles.statLabel}>Team Members</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>⊡</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>0 MB</span>
            <span className={styles.statLabel}>Storage Used</span>
          </div>
          <div className={styles.storageBar}><div className={styles.storageFill} style={{ width: `${storagePercent}%` }} /></div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick actions</h2>
        <div className={styles.quickGrid}>
          <Link href="/events" className={styles.quickCard}><span className={styles.quickIcon}>◇</span><div><span className={styles.quickLabel}>Browse Events</span><span className={styles.quickMeta}>View all events and galleries</span></div></Link>
          <Link href="/my-photos" className={styles.quickCard}><span className={styles.quickIcon}>◐</span><div><span className={styles.quickLabel}>Find My Photos</span><span className={styles.quickMeta}>AI-powered face recognition</span></div></Link>
          <Link href="/search" className={styles.quickCard}><span className={styles.quickIcon}>⌕</span><div><span className={styles.quickLabel}>Search</span><span className={styles.quickMeta}>By tag, person, or event</span></div></Link>
          <Link href="/settings" className={styles.quickCard}><span className={styles.quickIcon}>⚙</span><div><span className={styles.quickLabel}>Workspace Settings</span><span className={styles.quickMeta}>Team, billing, and more</span></div></Link>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent events</h2>
          <Link href="/events" className={styles.seeAll}>View all →</Link>
        </div>
        {eventsLoading ? (
          <div className={styles.eventsGrid}>{Array.from({ length: 3 }).map((_, i) => (<div key={i} className={styles.skeleton} />))}</div>
        ) : events.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>◇</div>
            <h3 className={styles.emptyTitle}>No events yet</h3>
            <p className={styles.emptyDesc}>Create your first event to start uploading photos.</p>
          </div>
        ) : (
          <div className={styles.eventsGrid}>{events.map((event: any) => (<EventCard key={event.id} event={event} />))}</div>
        )}
      </section>

      <section className={styles.planBanner}>
        <div className={styles.planInfo}>
          <h3 className={styles.planTitle}>Starter Plan</h3>
          <p className={styles.planDesc}>You&apos;re on the free plan. Upgrade to Pro for unlimited events, AI face recognition, and advanced analytics.</p>
        </div>
        <Link href="/settings" className={styles.upgradeBtn}>Upgrade to Pro</Link>
      </section>
    </main>
  )
}
