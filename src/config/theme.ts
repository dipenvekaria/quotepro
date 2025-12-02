/**
 * The Field Genie Theme Configuration
 * Centralized theme management - Single source of truth
 * 
 * Theme: Executive Black with Professional Bold Typography (90% scale)
 */

export const theme = {
  /**
   * COLOR PALETTE
   * Executive Black: Sophisticated dark palette with blue accents
   */
  colors: {
    // Primary: Slate-900 for authority and professionalism
    primary: {
      bg: 'bg-slate-900',
      text: 'text-slate-900',
      border: 'border-slate-900',
      hover: 'hover:bg-black',
      DEFAULT: '#0f172a',
    },
    
    // Accent: Blue-600 for interactive elements and CTAs
    accent: {
      bg: 'bg-blue-600',
      text: 'text-blue-600',
      border: 'border-blue-600',
      hover: 'hover:bg-blue-700',
      DEFAULT: '#2563eb',
    },
    
    // Secondary: Neutral grays
    secondary: {
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-300',
      hover: 'hover:bg-slate-200',
    },
    
    // Success: Green for positive actions
    success: {
      bg: 'bg-emerald-600',
      text: 'text-emerald-600',
      hover: 'hover:bg-emerald-700',
    },
    
    // Warning: Amber for alerts
    warning: {
      bg: 'bg-amber-500',
      text: 'text-amber-600',
      hover: 'hover:bg-amber-600',
    },
    
    // Danger: Red for destructive actions
    danger: {
      bg: 'bg-red-700',
      text: 'text-red-700',
      hover: 'hover:bg-red-800',
    },
    
    // UI Elements
    card: {
      bg: 'bg-white',
      border: 'border-slate-400',
    },
    
    sidebar: {
      bg: 'bg-slate-50',
    },
  },
  
  /**
   * TYPOGRAPHY
   * Professional Bold - Standard Tailwind sizes (no reduction)
   */
  typography: {
    // Display heading - 6xl/60px
    display: {
      size: 'text-6xl',
      weight: 'font-bold',
      tracking: 'tracking-tighter',
      leading: 'leading-tight',
    },
    
    // Main heading - 3xl/30px
    h1: {
      size: 'text-3xl',
      weight: 'font-bold',
      tracking: 'tracking-tight',
      leading: 'leading-tight',
    },
    
    // Section heading - 2xl/24px
    h2: {
      size: 'text-2xl',
      weight: 'font-bold',
      tracking: 'tracking-tight',
      leading: 'leading-snug',
    },
    
    // Subsection - xl/20px
    h3: {
      size: 'text-xl',
      weight: 'font-bold',
      tracking: 'tracking-normal',
      leading: 'leading-snug',
    },
    
    // Small heading - lg/18px
    h4: {
      size: 'text-lg',
      weight: 'font-bold',
      tracking: 'tracking-normal',
      leading: 'leading-normal',
    },
    
    // Body text - base/16px
    body: {
      size: 'text-base',
      weight: 'font-bold',
      leading: 'leading-relaxed',
    },
    
    // Small text - sm/14px
    small: {
      size: 'text-sm',
      weight: 'font-bold',
      leading: 'leading-normal',
    },
    
    // Extra small - xs/12px
    tiny: {
      size: 'text-xs',
      weight: 'font-bold',
      leading: 'leading-tight',
    },
  },
  
  /**
   * SPACING
   * Consistent spacing scale
   */
  spacing: {
    // Cards
    card: {
      padding: 'p-4',
      gap: 'gap-3',
    },
    
    // Sections
    section: {
      padding: 'p-6',
      gap: 'gap-6',
    },
    
    // Page layout
    page: {
      padding: 'p-8',
      gap: 'gap-8',
    },
  },
  
  /**
   * COMPONENT STYLES
   * Pre-built component class combinations
   */
  components: {
    // Buttons
    button: {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2 rounded-lg shadow-sm transition-colors',
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium text-sm px-4 py-2 rounded-lg transition-colors',
      danger: 'bg-red-700 hover:bg-red-800 text-white font-bold text-sm px-4 py-2 rounded-lg shadow-sm transition-colors',
      success: 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2 rounded-lg shadow-sm transition-colors',
    },
    
    // Cards
    card: {
      base: 'bg-white border border-slate-400 rounded-lg shadow-sm p-4',
      hover: 'bg-white border border-slate-400 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow',
    },
    
    // Badges
    badge: {
      primary: 'bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-full',
      accent: 'bg-blue-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full',
      success: 'bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full',
      warning: 'bg-amber-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full',
      danger: 'bg-red-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-full',
    },
    
    // Navigation
    nav: {
      active: 'bg-blue-600 text-white font-medium text-sm',
      inactive: 'text-slate-700 hover:bg-slate-100 font-medium text-sm',
    },
  },
} as const;

/**
 * HELPER FUNCTIONS
 */

// Combine multiple theme classes
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Get button classes
export function getButtonClasses(variant: keyof typeof theme.components.button = 'primary'): string {
  return theme.components.button[variant];
}

// Get badge classes
export function getBadgeClasses(variant: keyof typeof theme.components.badge = 'primary'): string {
  return theme.components.badge[variant];
}

// Get card classes
export function getCardClasses(hover: boolean = false): string {
  return hover ? theme.components.card.hover : theme.components.card.base;
}

/**
 * USAGE EXAMPLES:
 * 
 * // Colors
 * <div className={theme.colors.primary.bg}>Primary background</div>
 * <Button className={theme.colors.accent.bg}>Accent button</Button>
 * 
 * // Typography
 * <h1 className={cn(theme.typography.h1.size, theme.typography.h1.weight)}>Heading</h1>
 * <p className={cn(theme.typography.body.size, theme.typography.body.weight)}>Body text</p>
 * 
 * // Components (recommended)
 * <Button className={getButtonClasses('primary')}>Click me</Button>
 * <Badge className={getBadgeClasses('success')}>New</Badge>
 * <Card className={getCardClasses(true)}>Hover card</Card>
 */
