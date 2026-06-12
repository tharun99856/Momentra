import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', backgroundColor: 'var(--color-bg-secondary)' }}>
      <div>
        <p style={{ fontFamily: 'var(--font-family-display)', fontSize: '5rem', fontWeight: 400, color: 'var(--color-neutral-300)', margin: '0 0 1rem' }}>404</p>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 0.5rem' }}>Page not found</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0 0 2rem' }}>The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" style={{ padding: '0.625rem 1.5rem', backgroundColor: 'var(--color-neutral-900)', color: 'var(--color-text-inverse)', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 500 }}>
          Go home
        </Link>
      </div>
    </div>
  )
}
