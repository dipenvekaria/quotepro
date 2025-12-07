/**
 * ACTION BUTTON DESIGN SYSTEM
 * Professional, delightful buttons with perfect UX
 * 
 * Design Principles:
 * - Clear visual hierarchy (primary > secondary > tertiary)
 * - Generous touch targets (min 44px mobile, 40px desktop)
 * - Delightful micro-interactions
 * - Professional yet friendly
 * - Accessibility-first
 */

import { forwardRef, ButtonHTMLAttributes } from 'react'
import { Loader2, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button visual style */
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'success'
  /** Button size - affects height and padding */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Icon to display (left side) */
  icon?: LucideIcon
  /** Icon to display (right side) */
  iconRight?: LucideIcon
  /** Show loading spinner */
  loading?: boolean
  /** Full width button */
  fullWidth?: boolean
  /** Children (button text) */
  children?: React.ReactNode
}

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      icon: Icon,
      iconRight: IconRight,
      loading,
      fullWidth,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    // Base styles - always applied
    const baseStyles = cn(
      'inline-flex items-center justify-center gap-2',
      'font-medium transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
      'active:scale-[0.98]',
      fullWidth && 'w-full'
    )

    // Variant styles
    const variantStyles = {
      primary: cn(
        'bg-[#0055FF] text-white shadow-sm',
        'hover:bg-[#0046DD] hover:shadow-md',
        'focus-visible:ring-[#0055FF]',
        'active:shadow-sm'
      ),
      secondary: cn(
        'bg-white text-gray-900 border-2 border-gray-200 shadow-sm',
        'hover:bg-gray-50 hover:border-gray-300 hover:shadow',
        'focus-visible:ring-gray-400',
        'active:shadow-sm'
      ),
      ghost: cn(
        'bg-transparent text-gray-700',
        'hover:bg-gray-100',
        'focus-visible:ring-gray-400',
        'active:bg-gray-200'
      ),
      destructive: cn(
        'bg-white text-red-600 border-2 border-red-200 shadow-sm',
        'hover:bg-red-50 hover:border-red-300 hover:text-red-700',
        'focus-visible:ring-red-400',
        'active:shadow-sm'
      ),
      success: cn(
        'bg-green-600 text-white shadow-sm',
        'hover:bg-green-700 hover:shadow-md',
        'focus-visible:ring-green-500',
        'active:shadow-sm'
      ),
    }

    // Size styles - optimized for touch and desktop
    const sizeStyles = {
      sm: 'h-9 px-3 text-sm rounded-lg',
      md: 'h-11 px-4 text-base rounded-xl',
      lg: 'h-12 px-5 text-base rounded-xl',
      xl: 'h-14 px-6 text-lg rounded-xl',
    }

    // Icon size based on button size
    const iconSizes = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-5 w-5',
      xl: 'h-6 w-6',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
        ) : Icon ? (
          <Icon className={iconSizes[size]} />
        ) : null}
        
        {children}
        
        {IconRight && !loading && (
          <IconRight className={iconSizes[size]} />
        )}
      </button>
    )
  }
)

ActionButton.displayName = 'ActionButton'
