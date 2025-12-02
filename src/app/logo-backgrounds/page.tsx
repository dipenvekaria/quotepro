'use client'

import React, { useState } from 'react'
import { Check } from 'lucide-react'

// Lightning Bolt Logo with different background options
function LogoOption1() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg p-2 bg-gradient-to-br from-blue-600 to-blue-800" style={{ width: 40, height: 40 }}>
        <svg width={24} height={24} viewBox="0 0 24 24" fill="white">
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-bold text-gray-900">The Field Genie</span>
        <span className="text-xs text-muted-foreground font-bold">Win more jobs</span>
      </div>
    </div>
  )
}

function LogoOption2() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg p-2 bg-gradient-to-br from-blue-600 to-teal-500" style={{ width: 40, height: 40 }}>
        <svg width={24} height={24} viewBox="0 0 24 24" fill="white">
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-bold text-gray-900">The Field Genie</span>
        <span className="text-xs text-muted-foreground font-bold">Win more jobs</span>
      </div>
    </div>
  )
}

function LogoOption3() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg p-2 bg-gradient-to-br from-blue-700 to-teal-600" style={{ width: 40, height: 40 }}>
        <svg width={24} height={24} viewBox="0 0 24 24" fill="white">
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-bold text-gray-900">The Field Genie</span>
        <span className="text-xs text-muted-foreground font-bold">Win more jobs</span>
      </div>
    </div>
  )
}

function LogoOption4() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg p-2 bg-gradient-to-r from-blue-600 to-teal-500" style={{ width: 40, height: 40 }}>
        <svg width={24} height={24} viewBox="0 0 24 24" fill="white">
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-bold text-gray-900">The Field Genie</span>
        <span className="text-xs text-muted-foreground font-bold">Win more jobs</span>
      </div>
    </div>
  )
}

function LogoOption5() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg p-2 bg-gradient-to-tr from-blue-600 to-teal-400" style={{ width: 40, height: 40 }}>
        <svg width={24} height={24} viewBox="0 0 24 24" fill="white">
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-bold text-gray-900">The Field Genie</span>
        <span className="text-xs text-muted-foreground font-bold">Win more jobs</span>
      </div>
    </div>
  )
}

function LogoOption6() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg p-2 bg-gradient-to-br from-teal-600 to-blue-700" style={{ width: 40, height: 40 }}>
        <svg width={24} height={24} viewBox="0 0 24 24" fill="white">
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-bold text-gray-900">The Field Genie</span>
        <span className="text-xs text-muted-foreground font-bold">Win more jobs</span>
      </div>
    </div>
  )
}

function LogoOption7() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg p-2 bg-blue-600" style={{ width: 40, height: 40 }}>
        <svg width={24} height={24} viewBox="0 0 24 24" fill="white">
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-bold text-gray-900">The Field Genie</span>
        <span className="text-xs text-muted-foreground font-bold">Win more jobs</span>
      </div>
    </div>
  )
}

function LogoOption8() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg p-2 bg-teal-600" style={{ width: 40, height: 40 }}>
        <svg width={24} height={24} viewBox="0 0 24 24" fill="white">
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-bold text-gray-900">The Field Genie</span>
        <span className="text-xs text-muted-foreground font-bold">Win more jobs</span>
      </div>
    </div>
  )
}

function LogoOption9() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-xl p-2 bg-gradient-to-br from-blue-600 to-teal-500" style={{ width: 40, height: 40 }}>
        <svg width={24} height={24} viewBox="0 0 24 24" fill="white">
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-bold text-gray-900">The Field Genie</span>
        <span className="text-xs text-muted-foreground font-bold">Win more jobs</span>
      </div>
    </div>
  )
}

function LogoOption10() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-full p-2 bg-gradient-to-br from-blue-600 to-teal-500" style={{ width: 40, height: 40 }}>
        <svg width={24} height={24} viewBox="0 0 24 24" fill="white">
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-bold text-gray-900">The Field Genie</span>
        <span className="text-xs text-muted-foreground font-bold">Win more jobs</span>
      </div>
    </div>
  )
}

export default function LogoBackgroundsPage() {
  const [selected, setSelected] = useState<number | null>(null)

  const options = [
    { id: 1, name: 'Blue Gradient (Dark)', description: 'Blue-600 to Blue-800', component: LogoOption1 },
    { id: 2, name: 'Blue to Teal (Original)', description: 'Blue-600 to Teal-500', component: LogoOption2 },
    { id: 3, name: 'Blue to Teal (Darker)', description: 'Blue-700 to Teal-600', component: LogoOption3 },
    { id: 4, name: 'Blue to Teal (Horizontal)', description: 'Left to Right gradient', component: LogoOption4 },
    { id: 5, name: 'Blue to Teal (Light)', description: 'Blue-600 to Teal-400', component: LogoOption5 },
    { id: 6, name: 'Teal to Blue (Reversed)', description: 'Teal-600 to Blue-700', component: LogoOption6 },
    { id: 7, name: 'Solid Blue', description: 'Blue-600 solid', component: LogoOption7 },
    { id: 8, name: 'Solid Teal', description: 'Teal-600 solid', component: LogoOption8 },
    { id: 9, name: 'Blue to Teal (Rounded XL)', description: 'Larger border radius', component: LogoOption9 },
    { id: 10, name: 'Blue to Teal (Circle)', description: 'Fully rounded', component: LogoOption10 },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-sm font-bold text-gray-900 mb-2">
            Choose Logo Background Style
          </h1>
          <p className="text-sm text-gray-600">
            Select the background style that matches best with the Ocean Blue/Teal theme
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {options.map((option) => {
            const Component = option.component
            return (
              <div
                key={option.id}
                onClick={() => setSelected(option.id)}
                className={`
                  relative p-6 bg-white rounded-lg border-2 cursor-pointer
                  transition-all hover:shadow-lg
                  ${selected === option.id 
                    ? 'border-blue-600 shadow-lg' 
                    : 'border-gray-200'}
                `}
              >
                {selected === option.id && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-1">
                    Option {option.id}: {option.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {option.description}
                  </p>
                </div>

                {/* Large Preview */}
                <div className="mb-6 p-6 bg-gray-50 rounded-lg">
                  <div className="mb-2 text-xs font-bold text-gray-500">
                    Large (Expanded Sidebar)
                  </div>
                  <Component />
                </div>

                {/* Small Preview */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="mb-2 text-xs font-bold text-gray-500">
                    Small (Navigation)
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg p-2 bg-gradient-to-br from-blue-600 to-teal-500" style={{ width: 32, height: 32 }}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="white">
                        <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                      </svg>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      The Field Genie
                    </span>
                  </div>
                </div>

                {/* Icon Only */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="mb-2 text-xs font-bold text-gray-500">
                    Icon Only (Collapsed Sidebar)
                  </div>
                  <div className="rounded-lg p-2 bg-gradient-to-br from-blue-600 to-teal-500" style={{ width: 40, height: 40 }}>
                    <svg width={24} height={24} viewBox="0 0 24 24" fill="white">
                      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                    </svg>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {selected && (
          <div className="mt-8 p-6 bg-green-50 border-2 border-green-500 rounded-lg">
            <h3 className="text-sm font-bold text-green-900 mb-2">
              ✓ Option {selected} Selected
            </h3>
            <p className="text-green-700">
              Tell me which option you prefer and I'll apply it to your logo component.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
