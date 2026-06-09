import { Link } from 'react-router-dom'
import styles from './EventCard.module.css'

interface EventCardProps {
  event: {
    id: string
    name: string
    date: string
    category: string
    coverPhotoUrl: string | null
    mediaCount: number
    visibility: 'public' | 'private'
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link to={`/events/${event.id}`} className={styles.card}>
      <div className={styles.coverImage}>
        {event.coverPhotoUrl ? (
          <img
            src={event.coverPhotoUrl}
            alt={event.name}
            className={styles.img}
            loading="lazy"
          />
        ) : (
          <div className={styles.placeholder}>
            <span className={styles.placeholderIcon}>◇</span>
          </div>
        )}
      </div>
      <div className={styles.content}>
        <div className={styles.header}>
          <h2 className={styles.title}>{event.name}</h2>
          <div className={styles.badges}>
            <span className={styles.categoryBadge}>{event.category}</span>
            <span
              className={`${styles.visibilityBadge} ${
                event.visibility === 'public'
                  ? styles.visibilityPublic
                  : styles.visibilityPrivate
              }`}
            >
              {event.visibility === 'public' ? 'Public' : 'Private'}
            </span>
          </div>
        </div>
        <div className={styles.footer}>
          <span className={styles.date}>{formatDate(event.date)}</span>
          <span className={styles.photoCount}>
            {event.mediaCount} {event.mediaCount === 1 ? 'photo' : 'photos'}
          </span>
        </div>
      </div>
    </Link>
  )
}

export function EventCardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={`${styles.coverImage} ${styles.skeleton}`} />
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={`${styles.skeletonTitle} ${styles.skeleton}`} />
          <div className={styles.badges}>
            <div className={`${styles.skeletonBadge} ${styles.skeleton}`} />
            <div className={`${styles.skeletonBadge} ${styles.skeleton}`} />
          </div>
        </div>
        <div className={styles.footer}>
          <div className={`${styles.skeletonText} ${styles.skeleton}`} />
          <div className={`${styles.skeletonText} ${styles.skeleton}`} />
        </div>
      </div>
    </div>
  )
}
