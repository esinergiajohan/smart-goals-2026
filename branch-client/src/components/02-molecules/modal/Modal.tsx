import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from '../../01-atoms/button/Button.tsx'
import './modal.scss'

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}

export function Modal({ open, title, children, onClose }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal__bar">
        <h2 id={titleId} className="modal__title">
          {title}
        </h2>
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      </div>
      <div className="modal__body">{open && children}</div>
    </dialog>
  )
}
