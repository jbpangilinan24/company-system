import type {
  ReactNode,
} from 'react'

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'

type BadgeProps = {
  children: ReactNode
  variant?: BadgeVariant
}

function Badge({
  children,
  variant = 'default',
}: BadgeProps) {
  const variants: Record<
    BadgeVariant,
    string
  > = {
    default:
      'bg-slate-100 text-slate-700',

    success:
      'bg-emerald-50 text-emerald-700 ring-emerald-600/20',

    warning:
      'bg-amber-50 text-amber-700 ring-amber-600/20',

    danger:
      'bg-red-50 text-red-700 ring-red-600/20',

    info:
      'bg-blue-50 text-blue-700 ring-blue-600/20',

    purple:
      'bg-purple-50 text-purple-700 ring-purple-600/20',
  }

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        px-2.5
        py-1
        text-xs
        font-medium
        ring-1
        ring-inset
        ${variants[variant]}
      `}
    >
      {children}
    </span>
  )
}

export default Badge