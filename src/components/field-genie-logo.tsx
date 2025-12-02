import React from 'react'

interface FieldGenieLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  className?: string
}

export function FieldGenieLogo({ size = 'md', showText = true, className = '' }: FieldGenieLogoProps) {
  const sizes = {
    sm: { icon: 32, text: 'text-sm font-bold', tagline: 'text-[10px]' },
    md: { icon: 40, text: 'text-sm font-bold', tagline: 'text-xs' },
    lg: { icon: 44, text: 'text-sm font-bold', tagline: 'text-sm' },
    xl: { icon: 52, text: 'text-sm font-bold', tagline: 'text-sm' },
  }

  const iconSize = sizes[size].icon
  const textSize = sizes[size].text
  const taglineSize = sizes[size].tagline

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Lightning Bolt Icon */}
      <div 
        className="rounded-lg p-2 flex-shrink-0 bg-slate-900"
        style={{ 
          width: iconSize,
          height: iconSize
        }}
      >
        <svg 
          width={iconSize - 16} 
          height={iconSize - 16} 
          viewBox="0 0 24 24" 
          fill="white"
        >
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
      </div>

      {/* Text Logo */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`${textSize} font-bold text-gray-900 whitespace-nowrap`}>
            The Field Genie
          </span>
          <span className={`${taglineSize} text-muted-foreground font-medium tracking-wide`}>
            Win more jobs
          </span>
        </div>
      )}
    </div>
  )
}

// Icon-only version for small spaces (collapsed sidebar, mobile, etc.)
export function FieldGenieIcon({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <div 
      className={`rounded-lg p-2 flex items-center justify-center bg-slate-900 ${className}`}
      style={{ 
        width: size,
        height: size
      }}
    >
      <svg 
        width={size - 16} 
        height={size - 16} 
        viewBox="0 0 24 24" 
        fill="white"
      >
        <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
      </svg>
    </div>
  )
}
