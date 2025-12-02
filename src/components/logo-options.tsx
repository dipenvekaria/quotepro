import React from 'react'

// Logo Option 1: Simple Minimalist
export function Logo1({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="url(#gradient1)" />
          <path d="M32 16 L32 48 M20 32 L44 32" stroke="white" strokeWidth="4" strokeLinecap="round" />
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#0d9488" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span className="text-sm font-medium font-bold bg-gradient-to-r from-blue-700 to-teal-600 bg-clip-text text-transparent">
        Field Genie
      </span>
    </div>
  )
}

// Logo Option 2: Letter Mark FG
export function Logo2({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative rounded-lg overflow-hidden" style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" fill="url(#gradient2)" />
          <text x="32" y="42" fontFamily="sans-serif" fontSize="28" fontWeight="bold" fill="white" textAnchor="middle">FG</text>
          <defs>
            <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#0d9488" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span className="text-sm font-medium font-bold text-gray-900">Field Genie</span>
    </div>
  )
}

// Logo Option 3: Hexagon Badge
export function Logo3({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <path d="M32 4 L54 16 L54 48 L32 60 L10 48 L10 16 Z" fill="url(#gradient3)" />
        <path d="M32 18 L32 46 M22 32 L42 32" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <defs>
          <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-sm font-medium font-bold text-gray-900">Field Genie</span>
    </div>
  )
}

// Logo Option 4: Tool Icon Simple
export function Logo4({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-lg p-2" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #0d9488 100%)' }}>
        <svg width={size - 16} height={size - 16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      </div>
      <span className="text-sm font-medium font-bold text-gray-900">Field Genie</span>
    </div>
  )
}

// Logo Option 5: Lightning Bolt
export function Logo5({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-lg p-2" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #0d9488 100%)' }}>
        <svg width={size - 16} height={size - 16} viewBox="0 0 24 24" fill="white">
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
      </div>
      <span className="text-sm font-medium font-bold text-gray-900">Field Genie</span>
    </div>
  )
}

// Logo Option 6: Circle with Checkmark
export function Logo6({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="28" fill="url(#gradient6)" />
        <path d="M20 32 L28 40 L44 24" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="gradient6" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-sm font-medium font-bold text-gray-900">Field Genie</span>
    </div>
  )
}

// Logo Option 7: Shield
export function Logo7({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <path d="M32 8 L52 18 L52 36 C52 48 32 56 32 56 C32 56 12 48 12 36 L12 18 Z" fill="url(#gradient7)" />
        <path d="M26 32 L30 36 L38 28" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="gradient7" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-sm font-medium font-bold text-gray-900">Field Genie</span>
    </div>
  )
}

// Logo Option 8: Modern Square
export function Logo8({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-xl overflow-hidden" style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" fill="url(#gradient8)" />
          <circle cx="32" cy="32" r="12" fill="white" opacity="0.2" />
          <circle cx="32" cy="32" r="8" fill="white" />
          <defs>
            <linearGradient id="gradient8" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#0d9488" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span className="text-sm font-medium font-bold text-gray-900">Field Genie</span>
    </div>
  )
}

// Logo Option 9: Diamond
export function Logo9({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <path d="M32 8 L54 32 L32 56 L10 32 Z" fill="url(#gradient9)" />
        <path d="M32 20 L32 44" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <path d="M20 32 L44 32" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <defs>
          <linearGradient id="gradient9" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-sm font-medium font-bold text-gray-900">Field Genie</span>
    </div>
  )
}

// Logo Option 10: Rounded Square Badge
export function Logo10({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-2xl overflow-hidden" style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" fill="url(#gradient10)" />
          <text x="32" y="44" fontFamily="sans-serif" fontSize="32" fontWeight="900" fill="white" textAnchor="middle">F</text>
          <defs>
            <linearGradient id="gradient10" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#0d9488" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span className="text-sm font-medium font-bold text-gray-900">Field Genie</span>
    </div>
  )
}
