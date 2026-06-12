'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import styles from './AppLayout.module.css'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: '◐' },
  { href: '/events', label: 'Events', icon: '◇' },
  { href: '/search', label: 'Search', icon: '⌕' },
  { href: '/my-photos', label: 'My photos', icon: '◯' },
  { href: '/favourites', label: 'Favourites', icon: '★' },
  { href: '/upload', label: 'Upload', icon: '↑' },
] as const

function NavLink({ href, label, icon, exact }: { href: string; label: string; icon: string; exact?: boolean }) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
  return (
    <li>
      <Link href={href} className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
        <span className={styles.navIcon} aria-hidden="true">{icon}</span>
        <span>{label}</span>
      </Link>
    </li>
  )
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
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
            <NavLink href="/dashboard" label="Dashboard" icon="◐" exact />
            <NavLink href="/events" label="Events" icon="◇" />
            <NavLink href="/search" label="Search" icon="⌕" />
            <NavLink href="/my-photos" label="My photos" icon="◯" />
            <NavLink href="/favourites" label="Favourites" icon="★" />
            <NavLink href="/upload" label="Upload" icon="↑" />
          </ul>
        </nav>

        <div className={styles.workspaceSwitcher}>
          <span className={styles.sectionLabel}>Workspace</span>
          <button className={styles.workspaceButton} type="button">
            <span className={styles.workspaceAvatar}>{user?.username?.charAt(0).toUpperCase() ?? 'W'}</span>
            <span className={styles.workspaceName}>My Workspace</span>
          </button>
        </div>

        <div className={styles.sidebarFooter}>
          <Link href="/settings" className={`${styles.footerLink} ${pathname === '/settings' ? styles.footerLinkActive : ''}`}>⚙ Settings</Link>
          <Link href="/profile" className={`${styles.footerLink} ${pathname === '/profile' ? styles.footerLinkActive : ''}`}>
            <span className={styles.profileAvatar}>{user?.username?.charAt(0).toUpperCase() ?? '?'}</span>
            {user?.username ?? 'Profile'}
          </Link>
        </div>
      </aside>

      <nav className={styles.bottomNav} aria-label="Mobile navigation">
        {NAV_LINKS.map(({ href, label, icon }) => {
          const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
          return (
            <Link key={href} href={href} className={`${styles.tabItem} ${isActive ? styles.tabItemActive : ''}`}>
              <span aria-hidden="true">{icon}</span>
              <span className={styles.tabLabel}>{label}</span>
            </Link>
          )
        })}
      </nav>

      <main className={styles.content}>{children}</main>
    </div>
  )
}
