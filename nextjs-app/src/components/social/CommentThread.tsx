'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth.store'
import AddCommentForm from './AddCommentForm'
import styles from './CommentThread.module.css'

interface User { id: string; username: string; avatarUrl: string | null }
interface Comment {
  id: string; mediaId: string; userId: string; parentId: string | null;
  text: string; createdAt: string; updatedAt: string; user: User; replies?: Comment[]
}

function formatTimestamp(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const s = Math.floor(diff / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24)
  if (s < 60) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString()
}

export default function CommentThread({ mediaId }: { mediaId: string }) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ commentId: string; text: string } | null>(null)

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ['comments', mediaId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/media/${mediaId}/comments`)
      return data.data ?? data
    },
  })

  const editMutation = useMutation({
    mutationFn: async ({ commentId, text }: { commentId: string; text: string }) => {
      const { data } = await apiClient.patch('/api/social/comments', { commentId, text })
      return data
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['comments', mediaId] }); setEditing(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiClient.delete('/api/social/comments', { data: { commentId } })
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['comments', mediaId] }),
  })

  const canEdit = (c: Comment) => {
    if (!user || c.userId !== user.id) return false
    return Date.now() - new Date(c.createdAt).getTime() < 5 * 60 * 1000
  }
  const canDelete = (c: Comment) => !!user && (c.userId === user.id || user.globalRole === 'admin')

  const renderComment = (c: Comment, isReply = false): React.JSX.Element => {
    const isEditing = editing?.commentId === c.id
    const isReplying = replyingTo === c.id
    return (
      <div key={c.id} className={`${styles.comment} ${isReply ? styles.reply : ''}`}>
        <div className={styles.avatar}>
          {c.user.avatarUrl
            ? <img src={c.user.avatarUrl} alt="" />
            : <div className={styles.avatarPlaceholder}>{c.user.username[0]?.toUpperCase() ?? 'U'}</div>}
        </div>
        <div className={styles.commentContent}>
          <div className={styles.commentHeader}>
            <span className={styles.username}>{c.user.username}</span>
            <span className={styles.timestamp}>{formatTimestamp(c.createdAt)}</span>
            {c.updatedAt !== c.createdAt && <span className={styles.edited}>(edited)</span>}
          </div>

          {isEditing ? (
            <div className={styles.editForm}>
              <textarea
                className={styles.editTextarea}
                value={editing.text}
                onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                rows={3} maxLength={500} autoFocus
              />
              <div className={styles.editActions}>
                <span className={styles.charCount}>{editing.text.length} / 500</span>
                <div>
                  <button type="button" className={styles.cancelButton} onClick={() => setEditing(null)}>Cancel</button>
                  <button type="button" className={styles.saveButton}
                    onClick={() => editMutation.mutate({ commentId: c.id, text: editing.text.trim() })}
                    disabled={!editing.text.trim() || editing.text.length > 500 || editMutation.isPending}>
                    {editMutation.isPending ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          ) : <p className={styles.commentText}>{c.text}</p>}

          <div className={styles.commentActions}>
            {!isReply && (
              <button type="button" className={styles.actionButton} onClick={() => setReplyingTo(isReplying ? null : c.id)}>
                {isReplying ? 'Cancel' : 'Reply'}
              </button>
            )}
            {canEdit(c) && !isEditing && (
              <button type="button" className={styles.actionButton} onClick={() => setEditing({ commentId: c.id, text: c.text })}>Edit</button>
            )}
            {canDelete(c) && !isEditing && (
              <button type="button" className={`${styles.actionButton} ${styles.danger}`}
                onClick={() => { if (window.confirm('Delete this comment?')) deleteMutation.mutate(c.id) }}
                disabled={deleteMutation.isPending}>Delete</button>
            )}
          </div>

          {isReplying && (
            <div className={styles.replyForm}>
              <AddCommentForm mediaId={mediaId} parentId={c.id} placeholder={`Reply to ${c.user.username}…`} autoFocus compact onSuccess={() => setReplyingTo(null)} onCancel={() => setReplyingTo(null)} />
            </div>
          )}
          {c.replies && c.replies.length > 0 && (
            <div className={styles.replies}>{c.replies.map((r) => renderComment(r, true))}</div>
          )}
        </div>
      </div>
    )
  }

  const topLevel = comments.filter((c) => !c.parentId).map((c) => ({
    ...c, replies: comments.filter((r) => r.parentId === c.id),
  }))

  if (isLoading) return <div className={styles.loading}>Loading comments…</div>

  return (
    <div className={styles.commentThread}>
      <h3 className={styles.heading}>Comments ({comments.length})</h3>
      <AddCommentForm mediaId={mediaId} />
      {topLevel.length === 0
        ? <p className={styles.emptyState}>No comments yet. Be the first!</p>
        : <div className={styles.commentList}>{topLevel.map((c) => renderComment(c))}</div>}
    </div>
  )
}
