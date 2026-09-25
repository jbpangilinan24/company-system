import {
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react'

type AlertType =
  | 'success'
  | 'error'
  | 'info'

type AlertProps = {
  type?: AlertType
  message: string
}

function Alert({
  type = 'info',
  message,
}: AlertProps) {
  const config = {
    success: {
      icon: CheckCircle2,
      classes:
        'border-emerald-200 bg-emerald-50 text-emerald-700',
    },

    error: {
      icon: AlertCircle,
      classes:
        'border-red-200 bg-red-50 text-red-700',
    },

    info: {
      icon: Info,
      classes:
        'border-blue-200 bg-blue-50 text-blue-700',
    },
  }

  const selected =
    config[type]

  const Icon =
    selected.icon

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${selected.classes}`}
    >
      <Icon
        size={18}
        className="mt-0.5 shrink-0"
      />

      <p className="text-sm">
        {message}
      </p>
    </div>
  )
}

export default Alert