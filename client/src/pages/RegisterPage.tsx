import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { z } from 'zod'
import { apiClient } from '../lib/api-client'
import { useAuthStore } from '../stores/auth.store'
import styles from './AuthPages.module.css'

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, and underscores only'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})
    setServerError('')

    const result = registerSchema.safeParse({ username, email, password })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    try {
      const { data } = await apiClient.post('/api/auth/register', { username, email, password })
      setAuth(data.user, data.accessToken)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setServerError(err.response?.data?.error || 'Registration failed')
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
          <strong>AI-powered event photo management.</strong><br />
          Upload, organize, and share — built for teams that move fast.
        </p>
      </aside>

      <main className={styles.main}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>Create account</p>
          <h1 className={styles.title}>Start for free.</h1>
          <p className={styles.subtitle}>Create your workspace and start managing event photos in minutes.</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            {serverError && <div className={styles.error}>{serverError}</div>}

            <div className={styles.field}>
              <label htmlFor="username" className={styles.label}>Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className={styles.input}
                placeholder="your_handle"
                autoComplete="username"
              />
              {errors.username && <span className={styles.fieldError}>{errors.username}</span>}
            </div>

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
              {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
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
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
            </div>

            <button type="submit" disabled={loading} className={styles.button}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>

            <p className={styles.link}>
              Already a member? <Link to="/login">Sign in</Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  )
}
