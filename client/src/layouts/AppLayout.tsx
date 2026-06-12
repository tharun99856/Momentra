import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/auth.store'
import styles from './AppLayout.module.css'

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: '◐' },
  { to: '/events', label: 'Events', icon: '◇' },
  { to: '/search', label: 'Search', icon: '⌕' },
  { to: '/my-photos', label: 'My photos', icon: '◯' },
  { to: '/favourites', label: 'Favourites', icon: '★' },
  { to: '/upload', label: 'Upload', icon: '↑' },
] as const

export default function AppLayout() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar} aria-label="Main navigation">
        <div className={styles.wordmark}>
          <span className={styles.logo}>Momentra</span>
          <span className={styles.badge}>SaaS</span>
        </div>

        <nav className={styles.nav}>
          <ul role="list">
            {NAV_LINKS.map(({ to, label, icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/dashboard'}
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

        <div className={styles.workspaceSwitcher}>
          <span className={styles.sectionLabel}>Workspace</span>
          <button className={styles.workspaceButton} type="button">
            <span className={styles.workspaceAvatar}>
              {user?.username?.charAt(0).toUpperCase() ?? 'W'}
            </span>
            <span className={styles.workspaceName}>My Workspace</span>
          </button>
        </div>

        <div className={styles.sidebarFooter}>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `${styles.footerLink} ${isActive ? styles.footerLinkActive : ''}`
            }
          >
            ⚙ Settings
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `${styles.footerLink} ${isActive ? styles.footerLinkActive : ''}`
            }
          >
            <span className={styles.profileAvatar}>
              {user?.username?.charAt(0).toUpperCase() ?? '?'}
            </span>
            {user?.username ?? 'Profile'}
          </NavLink>
        </div>
      </aside>

      <nav className={styles.bottomNav} aria-label="Mobile navigation">
        {NAV_LINKS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
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
