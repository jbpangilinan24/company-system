import type {
  ButtonHTMLAttributes,
  ReactNode,
} from 'react'

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'ghost'

type ButtonSize =
  | 'sm'
  | 'md'

type ButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode
    variant?: ButtonVariant
    size?: ButtonSize
    loading?: boolean
  }

function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

  const variants: Record<
    ButtonVariant,
    string
  > = {
    primary:
      'bg-slate-900 text-white hover:bg-slate-800',

    secondary:
      'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',

    danger:
      'bg-red-600 text-white hover:bg-red-700',

    ghost:
      'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  }

  const sizes: Record<
    ButtonSize,
    string
  > = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
  }

  return (
    <button
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden="true"
        />
      )}

      {children}
    </button>
  )
}

export default Button