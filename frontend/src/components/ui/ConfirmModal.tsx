import {
  AlertTriangle,
} from 'lucide-react'

import Modal from './Modal'
import Button from './Button'

type ConfirmModalProps = {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
  error?: string
  onConfirm: () => void
  onClose: () => void
}

function ConfirmModal({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
  error = '',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={() => {
        if (!loading) {
          onClose()
        }
      }}
      size="sm"
    >
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle size={20} />
        </div>

        <p className="text-sm leading-6 text-slate-600">
          {message}
        </p>
      </div>

      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={loading}
        >
          {cancelText}
        </Button>

        <Button
          type="button"
          variant="danger"
          onClick={onConfirm}
          loading={loading}
        >
          {loading
            ? 'Please wait...'
            : confirmText}
        </Button>
      </div>
    </Modal>
  )
}

export default ConfirmModal