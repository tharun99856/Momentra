import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { apiClient } from '../lib/api-client'
import { useAuthStore } from '../stores/auth.store'
import styles from './AuthPages.module.css'

interface LocationState {
  from?: { pathname: string }
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const from = (location.state as LocationState)?.from?.pathname || '/'

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await apiClient.post('/api/auth/login', { email, password })
      setAuth(data.user, data.accessToken)
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <aside className={styles.aside}>
        <div className={styles.asideMedia} aria-hidden="true" />
        <div className={styles.asideContent}>
          <span className={styles.asideMark}>Momentra</span>
        </div>
        <p className={styles.asideFooter}>
          <strong>Every event, every photo, in one place.</strong><br />
          Galleries, search, and shared albums for your club.
        </p>
      </aside>

      <main className={styles.main}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>Sign in</p>
          <h1 className={styles.title}>Welcome back.</h1>
          <p className={styles.subtitle}>Enter your credentials to continue.</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={styles.input}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={styles.input}
                placeholder="Your password"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={loading} className={styles.button}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <p className={styles.link}>
              No account? <Link to="/register">Create one</Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  )
}
