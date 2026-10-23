import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from '../../01-atoms/button/Button.tsx'
import './confirm-dialog.scss'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  confirmVariant?: 'success' | 'warning'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  confirmVariant = 'success',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const messageId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onClose={onCancel}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <form
        className="confirm-dialog__panel"
        onSubmit={(event) => {
          event.preventDefault()
          onConfirm()
        }}
      >
        <h2 id={titleId} className="confirm-dialog__title">
          {title}
        </h2>
        <div id={messageId} className="confirm-dialog__message">
          {children}
        </div>
        <div className="confirm-dialog__actions">
          <Button onClick={onCancel}>Cancelar</Button>
          <Button type="submit" variant={confirmVariant}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
