'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import MasonryGrid from '@/components/gallery/MasonryGrid'
import AuthGuard from '@/components/AuthGuard'
import AppLayout from '@/components/AppLayout'
import styles from './MyPhotosPage.module.css'

export default function MyPhotosPage() {
  return (
    <AuthGuard>
      <AppLayout>
        <MyPhotosContent />
      </AppLayout>
    </AuthGuard>
  )
}

function MyPhotosContent() {
  const [isOptedIn, setIsOptedIn] = useState(false)
  const queryClient = useQueryClient()

  useQuery({
    queryKey: ['user-me'],
    queryFn: async () => {
      const res = await apiClient.get('/api/users/me')
      setIsOptedIn(!!res.data.hasFaceDescriptor)
      return res.data
    },
  })

  const { data: photos, isLoading } = useQuery({
    queryKey: ['my-photos'],
    queryFn: async () => {
      const res = await apiClient.get('/api/users/me/photos', { params: { pageSize: 50 } })
      return res.data
    },
    enabled: isOptedIn,
  })

  const uploadSelfie = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      await apiClient.post('/api/users/me/face', formData)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-me'] })
      void queryClient.invalidateQueries({ queryKey: ['my-photos'] })
    },
  })

  const removeFace = useMutation({
    mutationFn: () => apiClient.delete('/api/users/me/face'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-me'] })
      setIsOptedIn(false)
    },
  })

  if (!isOptedIn) {
    return (
      <div className={styles.optInPage}>
        <div className={styles.optInCard}>
          <div className={styles.optInIcon}>📸</div>
          <h1 className={styles.optInTitle}>Find yourself in event photos</h1>
          <p className={styles.optInText}>Upload a selfie to automatically identify yourself in photos across all events.</p>
          <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSelfie.mutate(f) }} style={{ display: 'none' }} id="selfie-upload" />
          <label htmlFor="selfie-upload" className={styles.optInButton}>
            {uploadSelfie.isPending ? 'Processing…' : 'Upload Selfie'}
          </label>
          {uploadSelfie.isError && <p className={styles.optInError}>Upload failed. Please try again.</p>}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>My Photos</h1>
          <p className={styles.subtitle}>{photos?.total ?? 0} photos across {photos?.eventCount ?? 0} events</p>
        </div>
        <button onClick={() => removeFace.mutate()} disabled={removeFace.isPending} className={styles.removeButton}>
          {removeFace.isPending ? 'Removing…' : 'Remove face data'}
        </button>
      </header>

      {isLoading ? (
        <div className={styles.loading}>Scanning photos…</div>
      ) : (
        <MasonryGrid items={photos?.items ?? []} onItemClick={() => {}} />
      )}
    </div>
  )
}
