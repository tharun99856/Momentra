import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      textAlign: 'center',
      padding: '2rem',
      backgroundColor: 'var(--color-bg-secondary)',
    }}>
      <h1 style={{
        fontFamily: 'var(--font-family-display)',
        fontSize: 'clamp(3rem, 8vw, 6rem)',
        fontWeight: 400,
        letterSpacing: '-0.02em',
        lineHeight: 1,
        marginBottom: '0.5rem',
      }}>
        404
      </h1>
      <p style={{
        fontSize: 'var(--font-size-lg)',
        color: 'var(--color-text-secondary)',
        marginBottom: '2rem',
      }}>
        This page doesn't exist.
      </p>
      <Link
        to="/"
        style={{
          padding: '0.75rem 2rem',
          backgroundColor: 'var(--color-neutral-900)',
          color: 'white',
          borderRadius: '9999px',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 600,
        }}
      >
        Back to home
      </Link>
    </main>
  )
}
