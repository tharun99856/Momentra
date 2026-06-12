'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth.store'
import AuthGuard from '@/components/AuthGuard'
import AppLayout from '@/components/AppLayout'
import styles from './ProfilePage.module.css'

export default function ProfilePage() {
  return (
    <AuthGuard>
      <AppLayout>
        <ProfileContent />
      </AppLayout>
    </AuthGuard>
  )
}

function ProfileContent() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [saved, setSaved] = useState(false)

  const updateProfile = useMutation({
    mutationFn: async (data: { username?: string; email?: string }) => {
      await apiClient.patch('/api/users/me', data)
    },
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000) },
  })

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      await apiClient.post('/api/users/me/avatar', formData)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['user-me'] }),
  })

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Profile</h1>

      <div className={styles.avatarRow}>
        <div className={styles.avatar}>
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt="" className={styles.avatarImg} />
            : <div className={styles.avatarPlaceholder}>{user?.username?.[0]?.toUpperCase() ?? 'U'}</div>}
        </div>
        <div>
          <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar.mutate(f) }} style={{ display: 'none' }} id="avatar-upload" />
          <label htmlFor="avatar-upload" className={styles.changeAvatarBtn}>
            {uploadAvatar.isPending ? 'Uploading…' : 'Change photo'}
          </label>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); updateProfile.mutate({ username, email }) }} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="username" className={styles.label}>Username</label>
          <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className={styles.input} />
        </div>
        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={styles.input} />
        </div>
        <button type="submit" disabled={updateProfile.isPending} className={styles.saveButton}>
          {updateProfile.isPending ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
        {updateProfile.isError && <p className={styles.errorMsg}>Failed to save. Please try again.</p>}
      </form>

      <div className={styles.meta}>
        <span className={styles.metaItem}>Role: <strong>{user?.globalRole}</strong></span>
      </div>
    </div>
  )
}
