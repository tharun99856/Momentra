'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { apiClient } from '@/lib/api-client'

function AuthBootstrap({ children }: { children: ReactNode }) {
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--color-bg-secondary)',
          color: 'var(--color-text-secondary)',
          fontSize: '0.875rem',
          letterSpacing: '0.04em',
        }}
      >
        Loading…
      </div>
    )
  }

  return <>{children}</>
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: { retry: 0 },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>{children}</AuthBootstrap>
    </QueryClientProvider>
  )
}
