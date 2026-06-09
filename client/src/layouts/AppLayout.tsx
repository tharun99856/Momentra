import { NavLink, Outlet } from 'react-router-dom'
import styles from './AppLayout.module.css'

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: '◐' },
  { to: '/events', label: 'Events', icon: '◇' },
  { to: '/search', label: 'Search', icon: '⌕' },
  { to: '/my-photos', label: 'My photos', icon: '◯' },
  { to: '/favourites', label: 'Favourites', icon: '★' },
  { to: '/upload', label: 'Upload', icon: '↑' },
] as const

export default function AppLayout() {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar} aria-label="Main navigation">
        <div className={styles.wordmark}>
          <span className={styles.logo}>Momentra</span>
        </div>

        <nav className={styles.nav}>
          <ul role="list">
            {NAV_LINKS.map(({ to, label, icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                  }
                >
                  <span className={styles.navIcon} aria-hidden="true">{icon}</span>
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.clubSwitcher}>
          <span className={styles.sectionLabel}>Club</span>
          <button className={styles.clubButton} type="button">
            Select club
          </button>
        </div>

        <div className={styles.sidebarFooter}>
          <button className={styles.notificationBtn} type="button" aria-label="Notifications">
            ◴
          </button>
        </div>
      </aside>

      <nav className={styles.bottomNav} aria-label="Mobile navigation">
        {NAV_LINKS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `${styles.tabItem} ${isActive ? styles.tabItemActive : ''}`
            }
          >
            <span aria-hidden="true">{icon}</span>
            <span className={styles.tabLabel}>{label}</span>
          </NavLink>
        ))}
      </nav>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
