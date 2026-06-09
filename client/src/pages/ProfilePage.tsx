import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { useAuthStore } from '../stores/auth.store'

export function ProfilePage() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()

  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')

  const updateProfile = useMutation({
    mutationFn: async (data: { username?: string; email?: string }) => {
      await apiClient.patch('/api/users/me', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      await apiClient.post('/api/users/me/avatar', formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadAvatar.mutate(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfile.mutate({ username, email })
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Profile</h1>

      <div style={{ marginTop: '2rem' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#ccc', marginBottom: '1rem', position: 'relative' }}>
          <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} id="avatar-upload" />
          <label htmlFor="avatar-upload" style={{ position: 'absolute', bottom: 0, right: 0, background: 'white', borderRadius: '50%', padding: '0.25rem', cursor: 'pointer' }}>
            📷
          </label>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </div>

          <button type="submit" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
