import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'
import { useAuthStore } from '../../stores/auth.store'
import AddCommentForm from './AddCommentForm'
import styles from './CommentThread.module.css'

interface User {
  id: string
  username: string
  avatarUrl: string | null
}

interface Comment {
  id: string
  mediaId: string
  userId: string
  parentId: string | null
  text: string
  createdAt: string
  updatedAt: string
  user: User
  replies?: Comment[]
}

interface CommentThreadProps {
  mediaId: string
}

interface EditState {
  commentId: string
  text: string
}

export default function CommentThread({ mediaId }: CommentThreadProps): React.JSX.Element {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditState | null>(null)

  // Fetch comments
  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ['comments', mediaId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/media/${mediaId}/comments`)
      return data.data ?? data
    },
  })

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async ({ commentId, text }: { commentId: string; text: string }) => {
      const { data } = await apiClient.patch<Comment>(`/api/comments/${commentId}`, { text })
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', mediaId] })
      setEditing(null)
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiClient.delete(`/api/comments/${commentId}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', mediaId] })
    },
  })

  const handleEditSubmit = (commentId: string): void => {
    if (!editing || editing.text.trim().length === 0 || editing.text.length > 500) {
      return
    }
    editMutation.mutate({ commentId, text: editing.text.trim() })
  }

  const handleDelete = (commentId: string): void => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteMutation.mutate(commentId)
    }
  }

  const canEdit = (comment: Comment): boolean => {
    if (!user) return false
    if (comment.userId !== user.id) return false
    const createdAt = new Date(comment.createdAt).getTime()
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000
    return now - createdAt < fiveMinutes
  }

  const canDelete = (comment: Comment): boolean => {
    if (!user) return false
    return comment.userId === user.id || user.globalRole === 'admin'
  }

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = Date.now()
    const diff = now - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return 'just now'
    if (minutes < 60) return `${String(minutes)}m ago`
    if (hours < 24) return `${String(hours)}h ago`
    if (days < 7) return `${String(days)}d ago`
    return date.toLocaleDateString()
  }

  const renderComment = (comment: Comment, isReply = false): React.JSX.Element => {
    const isEditing = editing?.commentId === comment.id
    const isReplying = replyingTo === comment.id

    return (
      <div
        key={comment.id}
        className={`${styles.comment} ${isReply ? styles.reply : ''}`}
      >
        <div className={styles.avatar}>
          {comment.user.avatarUrl ? (
            <img src={comment.user.avatarUrl} alt="" />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {comment.user.username[0]?.toUpperCase() ?? 'U'}
            </div>
          )}
        </div>

        <div className={styles.commentContent}>
          <div className={styles.commentHeader}>
            <span className={styles.username}>{comment.user.username}</span>
            <span className={styles.timestamp}>{formatTimestamp(comment.createdAt)}</span>
            {comment.updatedAt !== comment.createdAt && (
              <span className={styles.edited}>(edited)</span>
            )}
          </div>

          {isEditing ? (
            <div className={styles.editForm}>
              <textarea
                className={styles.editTextarea}
                value={editing.text}
                onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                rows={3}
                maxLength={500}
                autoFocus
              />
              <div className={styles.editActions}>
                <span className={styles.charCount}>
                  {editing.text.length} / 500
                </span>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.saveButton}
                  onClick={() => handleEditSubmit(comment.id)}
                  disabled={
                    editing.text.trim().length === 0 ||
                    editing.text.length > 500 ||
                    editMutation.isPending
                  }
                >
                  {editMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <p className={styles.commentText}>{comment.text}</p>
          )}

          <div className={styles.commentActions}>
            {!isReply && (
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => {
                  setReplyingTo(isReplying ? null : comment.id)
                }}
              >
                {isReplying ? 'Cancel' : 'Reply'}
              </button>
            )}
            {canEdit(comment) && !isEditing && (
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => {
                  setEditing({ commentId: comment.id, text: comment.text })
                }}
              >
                Edit
              </button>
            )}
            {canDelete(comment) && !isEditing && (
              <button
                type="button"
                className={`${styles.actionButton} ${styles.danger}`}
                onClick={() => {
                  void handleDelete(comment.id)
                }}
                disabled={deleteMutation.isPending}
              >
                Delete
              </button>
            )}
          </div>

          {isReplying && (
            <div className={styles.replyForm}>
              <AddCommentForm
                mediaId={mediaId}
                parentId={comment.id}
                placeholder={`Reply to ${comment.user.username}...`}
                autoFocus
                compact
                onSuccess={() => {
                  setReplyingTo(null)
                }}
                onCancel={() => {
                  setReplyingTo(null)
                }}
              />
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className={styles.replies}>
              {comment.replies.map((reply) => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Organize comments into top-level and replies
  const topLevelComments = comments.filter((c) => !c.parentId)
  const commentsWithReplies = topLevelComments.map((comment) => ({
    ...comment,
    replies: comments.filter((c) => c.parentId === comment.id),
  }))

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <p>Loading comments...</p>
      </div>
    )
  }

  return (
    <div className={styles.commentThread}>
      <h3 className={styles.heading}>Comments ({comments.length})</h3>

      <AddCommentForm mediaId={mediaId} />

      {commentsWithReplies.length === 0 ? (
        <p className={styles.emptyState}>No comments yet. Be the first to comment!</p>
      ) : (
        <div className={styles.commentList}>
          {commentsWithReplies.map((comment) => renderComment(comment))}
        </div>
      )}
    </div>
  )
}
