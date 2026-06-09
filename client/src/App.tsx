import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import { queryClient } from './lib/query-client'
import { useAuthStore } from './stores/auth.store'
import { apiClient } from './lib/api-client'
import './styles/global.css'

export default function App() {
  const [checking, setChecking] = useState(true)
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  useEffect(() => {
    apiClient
      .post('/api/auth/refresh')
      .then(({ data }) => setAuth(data.user, data.accessToken))
      .catch(() => clearAuth())
      .finally(() => setChecking(false))
  }, [setAuth, clearAuth])

  if (checking) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg-secondary)',
        color: 'var(--color-text-secondary)',
        fontSize: '0.875rem',
        letterSpacing: '0.04em',
      }}>
        Loading…
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
