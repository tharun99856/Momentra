import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import MasonryGrid from '../components/gallery/MasonryGrid'

export function MyPhotosPage() {
  const [isOptedIn, setIsOptedIn] = useState(false)
  const queryClient = useQueryClient()

  useQuery({
    queryKey: ['user-face-status'],
    queryFn: async () => {
      const response = await apiClient.get('/api/users/me')
      return response.data
    },
    select: (data) => {
      setIsOptedIn(!!data.hasFaceDescriptor)
      return data
    },
  })

  const { data: photos, isLoading } = useQuery({
    queryKey: ['my-photos'],
    queryFn: async () => {
      const response = await apiClient.get('/api/users/me/photos', {
        params: { pageSize: 50 },
      })
      return response.data
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
      queryClient.invalidateQueries({ queryKey: ['user-face-status'] })
      queryClient.invalidateQueries({ queryKey: ['my-photos'] })
    },
  })

  const removeFaceData = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/api/users/me/face')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-face-status'] })
      setIsOptedIn(false)
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadSelfie.mutate(file)
  }

  if (!isOptedIn) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <h1>Find yourself in event photos</h1>
        <p style={{ marginBottom: '2rem' }}>Upload a selfie to automatically identify yourself in photos</p>
        <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} id="selfie-upload" />
        <label htmlFor="selfie-upload" style={{ padding: '1rem 2rem', background: 'var(--color-primary)', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>
          Upload Selfie
        </label>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ maxWidth: '1200px', margin: '0 auto', marginBottom: '2rem' }}>
        <h1>My Photos</h1>
        <p>{photos?.total ?? 0} photos found across {photos?.eventCount ?? 0} events</p>
        <button onClick={() => removeFaceData.mutate()} style={{ marginTop: '1rem' }}>Remove face data</button>
      </header>

      {isLoading ? (
        <div style={{ textAlign: 'center' }}>Scanning photos...</div>
      ) : (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <MasonryGrid items={photos?.items || []} onItemClick={() => {}} />
        </div>
      )}
    </div>
  )
}
