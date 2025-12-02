'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PremiumLogosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-sm font-bold tracking-tighter text-slate-900">Premium Logo Gallery</h1>
          <p className="text-sm font-bold text-slate-600">
            10 sophisticated logo designs for Executive Black theme
          </p>
        </div>

        {/* Logo Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Option 1: Minimalist Lightning Bolt - Solid Black */}
          <Card className="shadow-xl border-slate-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Option 1</CardTitle>
                  <CardDescription className="text-sm font-bold">Minimalist Lightning - Solid Black</CardDescription>
                </div>
                <Badge className="bg-slate-900 text-white text-sm px-4 py-1.5">Classic</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-center gap-6 bg-white p-8 rounded-lg border-2 border-slate-300">
                <div className="rounded-lg p-3 bg-slate-900 shadow-lg">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                    <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                  </svg>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-slate-900">The Field Genie</span>
                  <span className="text-sm font-bold text-slate-600">Win more jobs</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Pure black, ultra-professional. No gradients, maximum impact.
              </p>
            </CardContent>
          </Card>

          {/* Option 2: Geometric Shield with Lightning */}
          <Card className="shadow-xl border-slate-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Option 2</CardTitle>
                  <CardDescription className="text-sm font-bold">Shield + Lightning Combo</CardDescription>
                </div>
                <Badge className="bg-blue-600 text-white text-sm px-4 py-1.5">Premium</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-center gap-6 bg-white p-8 rounded-lg border-2 border-slate-300">
                <div className="relative rounded-lg p-3 bg-slate-900 shadow-lg">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L4 7v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-5z" 
                          fill="white" opacity="0.3"/>
                    <path d="M13 9L8 14h4l-1 5 5-7h-4l1-3z" fill="white"/>
                  </svg>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-slate-900">The Field Genie</span>
                  <span className="text-sm font-bold text-slate-600">Win more jobs</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Protection + power. Shield represents trust, lightning = speed.
              </p>
            </CardContent>
          </Card>

          {/* Option 3: Hexagon with Lightning */}
          <Card className="shadow-xl border-slate-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Option 3</CardTitle>
                  <CardDescription className="text-sm font-bold">Hexagon Badge - Modern</CardDescription>
                </div>
                <Badge className="bg-slate-700 text-white text-sm px-4 py-1.5">Bold</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-center gap-6 bg-white p-8 rounded-lg border-2 border-slate-300">
                <div className="relative rounded-lg p-2 bg-slate-900 shadow-lg">
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L21 7v10l-9 5-9-5V7l9-5z" 
                          fill="white" opacity="0.2" stroke="white" strokeWidth="1"/>
                    <path d="M13 8L8 13h4l-1 5 6-8h-4l1-2z" fill="white"/>
                  </svg>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-slate-900">The Field Genie</span>
                  <span className="text-sm font-bold text-slate-600">Win more jobs</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Geometric precision. Modern tech meets field service.
              </p>
            </CardContent>
          </Card>

          {/* Option 4: Circle Badge - Ultra Premium */}
          <Card className="shadow-xl border-slate-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Option 4</CardTitle>
                  <CardDescription className="text-sm font-bold">Circle Badge - Ultra Premium</CardDescription>
                </div>
                <Badge className="bg-amber-500 text-white text-sm px-4 py-1.5">Luxury</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-center gap-6 bg-white p-8 rounded-lg border-2 border-slate-300">
                <div className="rounded-full p-3 bg-slate-900 shadow-lg border-4 border-slate-200">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                    <path d="M13 4L6 12h6l-1 8 7-10h-6l1-6z" />
                  </svg>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-slate-900">The Field Genie</span>
                  <span className="text-sm font-bold text-slate-600">Win more jobs</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Circular perfection with border. High-end, executive appeal.
              </p>
            </CardContent>
          </Card>

          {/* Option 5: Monogram "FG" with Lightning */}
          <Card className="shadow-xl border-slate-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Option 5</CardTitle>
                  <CardDescription className="text-sm font-bold">Monogram FG + Lightning</CardDescription>
                </div>
                <Badge className="bg-slate-900 text-white text-sm px-4 py-1.5">Sophisticated</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-center gap-6 bg-white p-8 rounded-lg border-2 border-slate-300">
                <div className="rounded-lg p-3 bg-slate-900 shadow-lg">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <text x="6" y="32" fontFamily="serif" fontSize="28" fontWeight="bold" fill="white">FG</text>
                    <path d="M34 12L28 20h4l-2 8 6-10h-4l2-6z" fill="#FFD700" opacity="0.9"/>
                  </svg>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-slate-900">The Field Genie</span>
                  <span className="text-sm font-bold text-slate-600">Win more jobs</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Monogram elegance with golden lightning accent. Executive brand.
              </p>
            </CardContent>
          </Card>

          {/* Option 6: Square Badge with Rounded Corners */}
          <Card className="shadow-xl border-slate-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Option 6</CardTitle>
                  <CardDescription className="text-sm font-bold">Square Badge - Tech Modern</CardDescription>
                </div>
                <Badge className="bg-blue-600 text-white text-sm px-4 py-1.5">Modern</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-center gap-6 bg-white p-8 rounded-lg border-2 border-slate-300">
                <div className="rounded-2xl p-4 bg-slate-900 shadow-lg">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                    <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                  </svg>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-slate-900">The Field Genie</span>
                  <span className="text-sm font-bold text-slate-600">Win more jobs</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Rounded square - Apple-inspired. Clean, modern, approachable.
              </p>
            </CardContent>
          </Card>

          {/* Option 7: Diamond Shape */}
          <Card className="shadow-xl border-slate-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Option 7</CardTitle>
                  <CardDescription className="text-sm font-bold">Diamond - Premium Quality</CardDescription>
                </div>
                <Badge className="bg-purple-700 text-white text-sm px-4 py-1.5">Elite</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-center gap-6 bg-white p-8 rounded-lg border-2 border-slate-300">
                <div className="relative p-2">
                  <div className="rotate-45 rounded-lg p-3 bg-slate-900 shadow-lg">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="white" className="-rotate-45">
                      <path d="M13 4L6 12h6l-1 8 7-10h-6l1-6z" />
                    </svg>
                  </div>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-slate-900">The Field Genie</span>
                  <span className="text-sm font-bold text-slate-600">Win more jobs</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Diamond cut. Premium quality symbol. Luxury positioning.
              </p>
            </CardContent>
          </Card>

          {/* Option 8: Minimal Square - Brutalist */}
          <Card className="shadow-xl border-slate-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Option 8</CardTitle>
                  <CardDescription className="text-sm font-bold">Brutalist Minimal - Sharp Edges</CardDescription>
                </div>
                <Badge className="bg-black text-white text-sm px-4 py-1.5">Brutal</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-center gap-6 bg-white p-8 rounded-lg border-2 border-slate-300">
                <div className="rounded-none p-4 bg-slate-900 shadow-lg border-2 border-black">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                    <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" strokeWidth="2" stroke="white"/>
                  </svg>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-slate-900">The Field Genie</span>
                  <span className="text-sm font-bold text-slate-600">Win more jobs</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                No curves. Pure brutalist design. Maximum authority.
              </p>
            </CardContent>
          </Card>

          {/* Option 9: Gradient Accent (Blue) */}
          <Card className="shadow-xl border-slate-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Option 9</CardTitle>
                  <CardDescription className="text-sm font-bold">Slate-to-Blue Gradient</CardDescription>
                </div>
                <Badge className="bg-blue-600 text-white text-sm px-4 py-1.5">Dynamic</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-center gap-6 bg-white p-8 rounded-lg border-2 border-slate-300">
                <div className="rounded-lg p-3 bg-gradient-to-br from-slate-900 to-blue-600 shadow-lg">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                    <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                  </svg>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-slate-900">The Field Genie</span>
                  <span className="text-sm font-bold text-slate-600">Win more jobs</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Subtle gradient adds depth. Professional with energy.
              </p>
            </CardContent>
          </Card>

          {/* Option 10: Double Border Prestige */}
          <Card className="shadow-xl border-slate-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Option 10</CardTitle>
                  <CardDescription className="text-sm font-bold">Double Border - Prestige</CardDescription>
                </div>
                <Badge className="bg-amber-500 text-white text-sm px-4 py-1.5">VIP</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-center gap-6 bg-white p-8 rounded-lg border-2 border-slate-300">
                <div className="relative">
                  <div className="absolute inset-0 rounded-lg border-4 border-slate-300"></div>
                  <div className="rounded-lg p-3 bg-slate-900 shadow-lg border-2 border-white">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                    </svg>
                  </div>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-slate-900">The Field Genie</span>
                  <span className="text-sm font-bold text-slate-600">Win more jobs</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Layered borders suggest premium quality. Executive prestige.
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Selection Guide */}
        <Card className="bg-gradient-to-r from-slate-50 to-blue-50 border-slate-300 shadow-xl">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Logo Selection Guide
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm font-bold">
              <div>
                <p className="font-bold text-slate-900 mb-2">Conservative / Corporate</p>
                <p className="text-slate-600">→ Options 1, 4, 10</p>
              </div>
              <div>
                <p className="font-bold text-slate-900 mb-2">Modern / Tech</p>
                <p className="text-slate-600">→ Options 3, 6, 8</p>
              </div>
              <div>
                <p className="font-bold text-slate-900 mb-2">Premium / Luxury</p>
                <p className="text-slate-600">→ Options 5, 7, 9</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
