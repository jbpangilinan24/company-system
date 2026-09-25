import {
  useEffect,
  type ReactNode,
} from 'react'

import { X } from 'lucide-react'

type ModalSize =
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'

type ModalProps = {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  size?: ModalSize
}

function Modal({
  open,
  title,
  description,
  children,
  onClose,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener(
      'keydown',
      handleKeyDown
    )

    document.body.style.overflow =
      'hidden'

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown
      )

      document.body.style.overflow =
        ''
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  const sizes: Record<
    ModalSize,
    string
  > = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`
          max-h-[90vh]
          w-full
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-2xl
          ${sizes[size]}
        `}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="pr-6">
            <h2
              id="modal-title"
              className="text-lg font-semibold text-slate-900"
            >
              {title}
            </h2>

            {description && (
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close modal"
          >
            <X size={19} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-90px)] overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal