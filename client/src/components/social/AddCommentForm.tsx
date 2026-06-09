import { useState, useRef, FormEvent, KeyboardEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'
import styles from './AddCommentForm.module.css'

interface AddCommentFormProps {
  mediaId: string
  parentId?: string
  placeholder?: string
  autoFocus?: boolean
  onSuccess?: () => void
  onCancel?: () => void
  compact?: boolean
}

interface AddCommentDto {
  text: string
  parentId?: string
}

interface Comment {
  id: string
  mediaId: string
  userId: string
  parentId: string | null
  text: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    username: string
    avatarUrl: string | null
  }
}

const MAX_CHARS = 500

export default function AddCommentForm({
  mediaId,
  parentId,
  placeholder = 'Add a comment...',
  autoFocus = false,
  onSuccess,
  onCancel,
  compact = false,
}: AddCommentFormProps): React.JSX.Element {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const queryClient = useQueryClient()

  const addCommentMutation = useMutation({
    mutationFn: async (dto: AddCommentDto): Promise<Comment> => {
      const { data } = await apiClient.post<Comment>(`/api/media/${mediaId}/comments`, dto)
      return data
    },
    onSuccess: () => {
      // Invalidate comments query to refetch
      void queryClient.invalidateQueries({ queryKey: ['comments', mediaId] })
      setText('')
      onSuccess?.()
    },
  })

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault()
    const trimmedText = text.trim()

    if (!trimmedText || trimmedText.length > MAX_CHARS) {
      return
    }

    addCommentMutation.mutate({
      text: trimmedText,
      parentId,
    })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
    if (e.key === 'Escape' && onCancel) {
      e.preventDefault()
      onCancel()
    }
  }

  const charCount = text.length
  const isOverLimit = charCount > MAX_CHARS
  const isNearLimit = charCount > MAX_CHARS * 0.9

  return (
    <form
      className={`${styles.form} ${compact ? styles.compact : ''}`}
      onSubmit={handleSubmit}
    >
      <div className={styles.inputWrapper}>
        <textarea
          ref={textareaRef}
          className={`${styles.textarea} ${isOverLimit ? styles.error : ''}`}
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          rows={compact ? 2 : 3}
          disabled={addCommentMutation.isPending}
          aria-label={parentId ? 'Reply to comment' : 'Add a comment'}
          aria-invalid={isOverLimit}
        />
        <div className={styles.footer}>
          <span
            className={`${styles.charCounter} ${
              isOverLimit ? styles.error : isNearLimit ? styles.warning : ''
            }`}
            aria-live="polite"
          >
            {charCount} / {MAX_CHARS}
          </span>
          <div className={styles.actions}>
            {onCancel && (
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => {
                  onCancel()
                }}
                disabled={addCommentMutation.isPending}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className={styles.submitButton}
              disabled={!text.trim() || isOverLimit || addCommentMutation.isPending}
            >
              {addCommentMutation.isPending ? 'Posting...' : parentId ? 'Reply' : 'Comment'}
            </button>
          </div>
        </div>
      </div>
      {addCommentMutation.isError && (
        <p className={styles.errorMessage} role="alert">
          Failed to post comment. Please try again.
        </p>
      )}
      <p className={styles.hint}>Press Enter to submit, Shift+Enter for new line</p>
    </form>
  )
}
