'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Logo1, Logo2, Logo3, Logo4, Logo5, 
  Logo6, Logo7, Logo8, Logo9, Logo10 
} from '@/components/logo-options'

const logos = [
  { id: 1, name: 'Minimalist Plus', component: Logo1, description: 'Simple cross icon, clean modern look' },
  { id: 2, name: 'Letter Mark FG', component: Logo2, description: 'Bold initials, professional' },
  { id: 3, name: 'Hexagon Badge', component: Logo3, description: 'Geometric strength, tech-focused' },
  { id: 4, name: 'Tool Icon', component: Logo4, description: 'Wrench icon, field service focus' },
  { id: 5, name: 'Lightning Bolt', component: Logo5, description: 'Speed and energy, instant quotes' },
  { id: 6, name: 'Circle Check', component: Logo6, description: 'Success and completion' },
  { id: 7, name: 'Shield', component: Logo7, description: 'Trust and protection' },
  { id: 8, name: 'Modern Square', component: Logo8, description: 'Contemporary dot design' },
  { id: 9, name: 'Diamond', component: Logo9, description: 'Premium and valuable' },
  { id: 10, name: 'Rounded Badge', component: Logo10, description: 'Single letter, bold statement' },
]

export default function LogoSelectionPage() {
  const [selected, setSelected] = useState<number | null>(null)
  const [darkMode, setDarkMode] = useState(false)

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-sm font-bold text-gray-900">
              Choose Your Logo
            </h1>
            <p className="text-sm text-gray-600">
              Select the logo design that best represents Field Genie
            </p>
            <div className="flex justify-center gap-3">
              <Button 
                variant={darkMode ? 'outline' : 'default'}
                onClick={() => setDarkMode(false)}
              >
                Light Mode
              </Button>
              <Button 
                variant={darkMode ? 'default' : 'outline'}
                onClick={() => setDarkMode(true)}
              >
                Dark Mode
              </Button>
            </div>
          </div>

          {/* Logo Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {logos.map((logo) => {
              const LogoComponent = logo.component
              const isSelected = selected === logo.id
              
              return (
                <Card 
                  key={logo.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    isSelected ? 'ring-4 ring-blue-500 shadow-xl' : ''
                  }`}
                  onClick={() => setSelected(logo.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Option {logo.id}: {logo.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Logo Preview - Large */}
                    <div className="flex items-center justify-center p-8 bg-white rounded-lg">
                      <LogoComponent size={48} />
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 text-center">
                      {logo.description}
                    </p>

                    {/* Small Preview */}
                    <div className="border-t pt-4">
                      <p className="text-xs text-gray-500 mb-2">Small size preview:</p>
                      <div className="flex items-center justify-center p-4 bg-gray-100 rounded">
                        <LogoComponent size={32} />
                      </div>
                    </div>

                    {/* Icon Only Preview */}
                    <div className="border-t pt-4">
                      <p className="text-xs text-gray-500 mb-2">Icon only (collapsed sidebar):</p>
                      <div className="flex items-center justify-center p-4 bg-gray-100 rounded">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-500 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold">{logo.id}</span>
                        </div>
                      </div>
                    </div>

                    {/* Select Button */}
                    {isSelected && (
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-sm font-bold text-blue-700">
                          ✓ Selected
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Selection Confirmation */}
          {selected && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6 text-center">
                <p className="text-sm font-bold text-blue-900 mb-2">
                  You selected: Option {selected} - {logos.find(l => l.id === selected)?.name}
                </p>
                <p className="text-sm text-blue-700">
                  Let me know when you're ready and I'll apply this logo throughout the app!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
