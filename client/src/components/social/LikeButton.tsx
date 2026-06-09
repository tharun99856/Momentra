import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'
import styles from './LikeButton.module.css'

interface LikeButtonProps {
  mediaId: string
  initialLiked: boolean
  initialCount: number
  size?: 'small' | 'medium' | 'large'
  showCount?: boolean
}

interface LikeResponse {
  liked: boolean
  count: number
}

export default function LikeButton({
  mediaId,
  initialLiked,
  initialCount,
  size = 'medium',
  showCount = true,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const queryClient = useQueryClient()

  const likeMutation = useMutation({
    mutationFn: async (): Promise<LikeResponse> => {
      const { data } = await apiClient.post<LikeResponse>(`/api/media/${mediaId}/likes`)
      return data
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['media', mediaId] })
      const prev = { liked, count }
      setLiked(!liked)
      setCount((c) => (liked ? c - 1 : c + 1))
      return prev
    },
    onError: (_err, _vars, prev) => {
      if (prev) {
        setLiked(prev.liked)
        setCount(prev.count)
      }
    },
    onSuccess: (data) => {
      setLiked(data.liked)
      setCount(data.count)
    },
  })

  const sizeClass = { small: styles.small, medium: styles.medium, large: styles.large }[size]

  return (
    <button
      type="button"
      className={`${styles.likeButton} ${sizeClass} ${liked ? styles.liked : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        likeMutation.mutate()
      }}
      disabled={likeMutation.isPending}
      aria-label={liked ? 'Unlike photo' : 'Like photo'}
      aria-pressed={liked}
    >
      <span className={styles.icon} aria-hidden="true">{liked ? '♥' : '♡'}</span>
      {showCount && <span className={styles.count}>{count}</span>}
    </button>
  )
}
