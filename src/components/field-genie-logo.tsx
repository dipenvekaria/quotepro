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
      {/* Field Genie Logo */}
      <img 
        src="/thefieldgenie.png" 
        alt="The Field Genie" 
        className="flex-shrink-0 object-contain"
        style={{ 
          width: iconSize,
          height: iconSize
        }}
      />

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
    <img 
      src="/thefieldgenie.png" 
      alt="The Field Genie" 
      className={`object-contain ${className}`}
      style={{ 
        width: size,
        height: size
      }}
    />
  )
}
