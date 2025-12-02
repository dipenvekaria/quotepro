'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Search, 
  Plus, 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Settings,
  ChevronRight,
  Star,
  Zap,
  Heart,
  Calendar,
  Mail,
  Phone,
  Type
} from 'lucide-react';

// PREMIUM PROFESSIONAL THEMES - High-end, sophisticated color palettes
const themes = {
  premiumNavy: {
    name: 'Premium Navy',
    colors: {
      primary: 'bg-blue-900 hover:bg-blue-950 text-white',
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900',
      accent: 'bg-amber-600 hover:bg-amber-700 text-white',
      success: 'bg-blue-700 hover:bg-blue-800 text-white',
      warning: 'bg-amber-500 hover:bg-amber-600 text-white',
      danger: 'bg-red-700 hover:bg-red-800 text-white',
      cardBg: 'bg-white',
      cardBorder: 'border-slate-300',
      text: 'text-slate-900',
      textMuted: 'text-slate-600',
      badge: 'bg-blue-900 text-white',
      sidebar: 'bg-slate-50',
    }
  },
  executiveBlack: {
    name: 'Executive Black',
    colors: {
      primary: 'bg-slate-900 hover:bg-black text-white',
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900',
      accent: 'bg-blue-600 hover:bg-blue-700 text-white',
      success: 'bg-slate-700 hover:bg-slate-800 text-white',
      warning: 'bg-amber-500 hover:bg-amber-600 text-white',
      danger: 'bg-red-700 hover:bg-red-800 text-white',
      cardBg: 'bg-white',
      cardBorder: 'border-slate-400',
      text: 'text-slate-900',
      textMuted: 'text-slate-600',
      badge: 'bg-slate-900 text-white',
      sidebar: 'bg-slate-50',
    }
  },
  deepOcean: {
    name: 'Deep Ocean',
    colors: {
      primary: 'bg-blue-800 hover:bg-blue-900 text-white',
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900',
      accent: 'bg-teal-700 hover:bg-teal-800 text-white',
      success: 'bg-blue-600 hover:bg-blue-700 text-white',
      warning: 'bg-amber-500 hover:bg-amber-600 text-white',
      danger: 'bg-red-700 hover:bg-red-800 text-white',
      cardBg: 'bg-white',
      cardBorder: 'border-slate-300',
      text: 'text-slate-900',
      textMuted: 'text-slate-600',
      badge: 'bg-blue-800 text-white',
      sidebar: 'bg-slate-50',
    }
  },
  royalPurple: {
    name: 'Royal Purple',
    colors: {
      primary: 'bg-purple-900 hover:bg-purple-950 text-white',
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900',
      accent: 'bg-violet-700 hover:bg-violet-800 text-white',
      success: 'bg-purple-700 hover:bg-purple-800 text-white',
      warning: 'bg-amber-500 hover:bg-amber-600 text-white',
      danger: 'bg-red-700 hover:bg-red-800 text-white',
      cardBg: 'bg-white',
      cardBorder: 'border-slate-300',
      text: 'text-slate-900',
      textMuted: 'text-slate-600',
      badge: 'bg-purple-900 text-white',
      sidebar: 'bg-slate-50',
    }
  },
  modernTeal: {
    name: 'Modern Teal',
    colors: {
      primary: 'bg-teal-800 hover:bg-teal-900 text-white',
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900',
      accent: 'bg-cyan-700 hover:bg-cyan-800 text-white',
      success: 'bg-teal-600 hover:bg-teal-700 text-white',
      warning: 'bg-amber-500 hover:bg-amber-600 text-white',
      danger: 'bg-red-700 hover:bg-red-800 text-white',
      cardBg: 'bg-white',
      cardBorder: 'border-slate-300',
      text: 'text-slate-900',
      textMuted: 'text-slate-600',
      badge: 'bg-teal-800 text-white',
      sidebar: 'bg-slate-50',
    }
  },
  charcoalSteel: {
    name: 'Charcoal Steel',
    colors: {
      primary: 'bg-gray-800 hover:bg-gray-900 text-white',
      secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
      accent: 'bg-blue-700 hover:bg-blue-800 text-white',
      success: 'bg-gray-700 hover:bg-gray-800 text-white',
      warning: 'bg-amber-500 hover:bg-amber-600 text-white',
      danger: 'bg-red-700 hover:bg-red-800 text-white',
      cardBg: 'bg-white',
      cardBorder: 'border-gray-300',
      text: 'text-gray-900',
      textMuted: 'text-gray-600',
      badge: 'bg-gray-800 text-white',
      sidebar: 'bg-gray-50',
    }
  },
};

// PREMIUM TYPOGRAPHY - Professional, refined, elegant
const typography = {
  executive: {
    name: 'Executive',
    classes: {
      heading: 'text-sm tracking-tight',
      subheading: 'text-sm tracking-tight',
      body: 'text-sm leading-relaxed',
      small: 'text-sm tracking-wide',
      cardPadding: 'p-6',
      spacing: 'gap-6',
    }
  },
  modern: {
    name: 'Modern',
    classes: {
      heading: 'text-sm font-bold tracking-tight',
      subheading: 'text-sm font-bold',
      body: 'text-sm leading-relaxed',
      small: 'text-sm',
      cardPadding: 'p-5',
      spacing: 'gap-5',
    }
  },
  elegant: {
    name: 'Elegant',
    classes: {
      heading: 'text-sm font-bold tracking-wide',
      subheading: 'text-sm font-bold',
      body: 'text-sm leading-loose',
      small: 'text-sm',
      cardPadding: 'p-8',
      spacing: 'gap-8',
    }
  },
  bold: {
    name: 'Bold Professional',
    classes: {
      heading: 'text-sm font-bold tracking-tighter',
      subheading: 'text-sm font-bold',
      body: 'text-sm font-bold',
      small: 'text-sm',
      cardPadding: 'p-4',
      spacing: 'gap-4',
    }
  },
};

export default function ThemeTestPage() {
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof themes>('premiumNavy');
  const [selectedTypography, setSelectedTypography] = useState<keyof typeof typography>('modern');

  const currentTheme = themes[selectedTheme];
  const currentTypo = typography[selectedTypography];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-sm font-bold text-slate-900 tracking-tight">Premium Theme Gallery</h1>
          <p className="text-sm text-slate-600 font-bold">
            Professional, high-end color schemes and typography for modern field service businesses
          </p>
        </div>

        {/* Theme Selection */}
        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="text-sm">Premium Color Themes</CardTitle>
            <CardDescription className="text-sm">Sophisticated palettes designed for professional appeal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {Object.entries(themes).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => setSelectedTheme(key as keyof typeof themes)}
                  className={`p-6 rounded-xl border-2 transition-all text-left shadow-sm hover:shadow-md ${
                    selectedTheme === key
                      ? 'border-blue-900 bg-blue-50 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-bold text-slate-900 mb-3 text-sm">{theme.name}</div>
                  <div className="flex gap-2">
                    <div className={`w-10 h-10 rounded-lg shadow-sm ${theme.colors.primary}`}></div>
                    <div className={`w-10 h-10 rounded-lg shadow-sm ${theme.colors.accent}`}></div>
                    <div className={`w-10 h-10 rounded-lg shadow-sm ${theme.colors.secondary}`}></div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Typography Selection */}
        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="text-sm">Typography Styles</CardTitle>
            <CardDescription className="text-sm">Refined typography for professional presentation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {Object.entries(typography).map(([key, typo]) => (
                <button
                  key={key}
                  onClick={() => setSelectedTypography(key as keyof typeof typography)}
                  className={`p-6 rounded-xl border-2 transition-all shadow-sm hover:shadow-md ${
                    selectedTypography === key
                      ? 'border-blue-900 bg-blue-50 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-bold text-slate-900 mb-2">{typo.name}</div>
                  <div className={currentTypo.classes.small + ' text-slate-600 mt-1'}>
                    Preview
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Preview Section */}
        <div className="space-y-8">
          <h2 className={`${currentTypo.classes.heading} font-bold ${currentTheme.colors.text}`}>
            {currentTheme.name} × {currentTypo.name}
          </h2>

          {/* Stats Cards */}
          <div className={`grid grid-cols-1 md:grid-cols-4 ${currentTypo.classes.spacing}`}>
            <Card className={`${currentTheme.colors.cardBg} shadow-md hover:shadow-lg transition-shadow`}>
              <CardContent className={currentTypo.classes.cardPadding}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`${currentTypo.classes.small} ${currentTheme.colors.textMuted} uppercase tracking-wider font-bold`}>
                      Total Leads
                    </p>
                    <p className={`${currentTypo.classes.heading} font-bold ${currentTheme.colors.text} mt-2`}>
                      247
                    </p>
                  </div>
                  <div className={`${currentTheme.colors.primary} w-14 h-14 rounded-xl flex items-center justify-center shadow-md`}>
                    <Users className="w-7 h-7" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${currentTheme.colors.cardBg} shadow-md hover:shadow-lg transition-shadow`}>
              <CardContent className={currentTypo.classes.cardPadding}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`${currentTypo.classes.small} ${currentTheme.colors.textMuted} uppercase tracking-wider font-bold`}>
                      Active Quotes
                    </p>
                    <p className={`${currentTypo.classes.heading} font-bold ${currentTheme.colors.text} mt-2`}>
                      89
                    </p>
                  </div>
                  <div className={`${currentTheme.colors.accent} w-14 h-14 rounded-xl flex items-center justify-center shadow-md`}>
                    <FileText className="w-7 h-7" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${currentTheme.colors.cardBg} shadow-md hover:shadow-lg transition-shadow`}>
              <CardContent className={currentTypo.classes.cardPadding}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`${currentTypo.classes.small} ${currentTheme.colors.textMuted} uppercase tracking-wider font-bold`}>
                      Revenue
                    </p>
                    <p className={`${currentTypo.classes.heading} font-bold ${currentTheme.colors.text} mt-2`}>
                      $127K
                    </p>
                  </div>
                  <div className={`${currentTheme.colors.success} w-14 h-14 rounded-xl flex items-center justify-center shadow-md`}>
                    <DollarSign className="w-7 h-7" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${currentTheme.colors.cardBg} shadow-md hover:shadow-lg transition-shadow`}>
              <CardContent className={currentTypo.classes.cardPadding}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`${currentTypo.classes.small} ${currentTheme.colors.textMuted} uppercase tracking-wider font-bold`}>
                      Win Rate
                    </p>
                    <p className={`${currentTypo.classes.heading} font-bold ${currentTheme.colors.text} mt-2`}>
                      64%
                    </p>
                  </div>
                  <div className={`${currentTheme.colors.success} w-14 h-14 rounded-xl flex items-center justify-center shadow-md`}>
                    <TrendingUp className="w-7 h-7" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Buttons */}
          <Card className="shadow-lg border-slate-200">
            <CardHeader>
              <CardTitle className={currentTypo.classes.subheading}>Action Buttons</CardTitle>
            </CardHeader>
            <CardContent className={currentTypo.classes.spacing}>
              <div className="flex flex-wrap gap-4">
                <Button className={`${currentTheme.colors.primary} shadow-md hover:shadow-lg transition-shadow`}>
                  <Plus className="w-5 h-5 mr-2" />
                  New Quote
                </Button>
                <Button className={`${currentTheme.colors.accent} shadow-md hover:shadow-lg transition-shadow`}>
                  <Star className="w-5 h-5 mr-2" />
                  Featured
                </Button>
                <Button className={`${currentTheme.colors.success} shadow-md hover:shadow-lg transition-shadow`}>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Complete
                </Button>
                <Button className={`${currentTheme.colors.warning} shadow-md hover:shadow-lg transition-shadow`}>
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Alert
                </Button>
                <Button className={`${currentTheme.colors.danger} shadow-md hover:shadow-lg transition-shadow`}>
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Badges */}
          <Card className="shadow-lg border-slate-200">
            <CardHeader>
              <CardTitle className={currentTypo.classes.subheading}>Status Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Badge className={`${currentTheme.colors.badge} text-sm px-4 py-1.5 shadow-sm`}>New Lead</Badge>
                <Badge className="bg-blue-600 text-white text-sm px-4 py-1.5 shadow-sm">Accepted</Badge>
                <Badge className="bg-amber-500 text-white text-sm px-4 py-1.5 shadow-sm">Pending</Badge>
                <Badge className="bg-red-700 text-white text-sm px-4 py-1.5 shadow-sm">Declined</Badge>
                <Badge className="bg-purple-700 text-white text-sm px-4 py-1.5 shadow-sm">Follow Up</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Sample Content Card */}
          <Card className={`${currentTheme.colors.cardBg} border ${currentTheme.colors.cardBorder} shadow-lg`}>
            <CardHeader className={currentTypo.classes.cardPadding}>
              <CardTitle className={`${currentTypo.classes.subheading} font-bold`}>
                Kitchen Renovation Project
              </CardTitle>
              <CardDescription className={`${currentTypo.classes.body} ${currentTheme.colors.textMuted}`}>
                Complete kitchen remodel with custom cabinetry, granite countertops, and premium appliances
              </CardDescription>
            </CardHeader>
            <CardContent className={`${currentTypo.classes.cardPadding} pt-0 ${currentTypo.classes.spacing}`}>
              <div className="flex items-center gap-6 text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span className={currentTypo.classes.small}>Dec 15, 2024</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  <span className={currentTypo.classes.small}>$45,000</span>
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <Button className={`${currentTheme.colors.primary} ${currentTypo.classes.small} shadow-md`}>
                  View Details
                </Button>
                <Button className={`${currentTheme.colors.secondary} ${currentTypo.classes.small} shadow-sm`}>
                  Send Proposal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selection Summary */}
        <Card className="bg-gradient-to-r from-blue-50 to-slate-50 border-blue-200 shadow-xl">
          <CardContent className="p-8">
            <h3 className="text-sm font-bold text-blue-900 mb-3">
              ✓ Current Selection
            </h3>
            <p className="text-blue-800 text-sm mb-4">
              <strong>Theme:</strong> {currentTheme.name} &nbsp;•&nbsp; <strong>Typography:</strong> {currentTypo.name}
            </p>
            <div className="text-blue-700 space-y-2">
              <p>✓ Premium professional aesthetics</p>
              <p>✓ High-end color palettes with depth and sophistication</p>
              <p>✓ Refined typography for elegant presentation</p>
              <p>✓ Enhanced shadows and spacing for modern look</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
