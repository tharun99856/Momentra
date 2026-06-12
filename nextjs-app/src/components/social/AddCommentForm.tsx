'use client'

import { useState, useRef, type FormEvent, type KeyboardEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
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

const MAX_CHARS = 500

export default function AddCommentForm({
  mediaId, parentId, placeholder = 'Add a comment…',
  autoFocus = false, onSuccess, onCancel, compact = false,
}: AddCommentFormProps) {
  const [text, setText] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post(`/api/social/comments`, {
        mediaId, text: text.trim(), parentId,
      })
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', mediaId] })
      setText('')
      onSuccess?.()
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim() || text.length > MAX_CHARS) return
    mutation.mutate()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) }
    if (e.key === 'Escape' && onCancel) { e.preventDefault(); onCancel() }
  }

  const charCount = text.length
  const isOverLimit = charCount > MAX_CHARS
  const isNearLimit = charCount > MAX_CHARS * 0.9

  return (
    <form className={`${styles.form} ${compact ? styles.compact : ''}`} onSubmit={handleSubmit}>
      <div className={styles.inputWrapper}>
        <textarea
          className={`${styles.textarea} ${isOverLimit ? styles.error : ''}`}
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          rows={compact ? 2 : 3}
          disabled={mutation.isPending}
          aria-label={parentId ? 'Reply to comment' : 'Add a comment'}
        />
        <div className={styles.footer}>
          <span className={`${styles.charCounter} ${isOverLimit ? styles.error : isNearLimit ? styles.warning : ''}`}>
            {charCount} / {MAX_CHARS}
          </span>
          <div className={styles.actions}>
            {onCancel && (
              <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={mutation.isPending}>
                Cancel
              </button>
            )}
            <button type="submit" className={styles.submitButton} disabled={!text.trim() || isOverLimit || mutation.isPending}>
              {mutation.isPending ? 'Posting…' : parentId ? 'Reply' : 'Comment'}
            </button>
          </div>
        </div>
      </div>
      {mutation.isError && <p className={styles.errorMessage} role="alert">Failed to post. Please try again.</p>}
      <p className={styles.hint}>Enter to submit · Shift+Enter for new line</p>
    </form>
  )
}
