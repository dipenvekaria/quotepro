/**
 * Global Theme Configuration - The Field Genie
 * Selected: Ocean Blue/Teal + Dense (XL Text)
 * Mobile-first design optimized for field agents
 */

export const globalTheme = {
  // Color Palette - Ocean Blue/Teal
  colors: {
    primary: 'bg-blue-700 hover:bg-blue-800',
    primaryText: 'text-blue-700',
    primaryBorder: 'border-blue-700',
    secondary: 'bg-slate-100 hover:bg-slate-200',
    accent: 'bg-teal-600 hover:bg-teal-700',
    accentText: 'text-teal-600',
    success: 'bg-emerald-600 hover:bg-emerald-700',
    successText: 'text-emerald-600',
    warning: 'bg-amber-600 hover:bg-amber-700',
    warningText: 'text-amber-600',
    danger: 'bg-rose-600 hover:bg-rose-700',
    dangerText: 'text-rose-600',
    cardBg: 'bg-white',
    cardBorder: 'border-blue-200',
    text: 'text-gray-900',
    textMuted: 'text-gray-600',
    badge: 'bg-blue-100 text-blue-800',
    gradient: 'bg-gradient-to-br from-blue-600 to-teal-500',
    sidebar: 'bg-blue-50',
  },

  // Typography - Dense (XL Text)
  // Small headings, large readable content, tight spacing
  typography: {
    font: 'font-sans',
    headingSize: 'text-sm',      // Extra large for important headings
    subheadingSize: 'text-sm',   // Large subheadings
    bodySize: 'text-sm',          // Large, readable body text
    smallSize: 'text-sm',       // Normal-sized small text
    weight: 'font-medium',
    headingWeight: 'font-bold',
    letterSpacing: 'tracking-normal',
    lineHeight: 'leading-relaxed',
  },

  // Spacing - Compact for mobile
  spacing: {
    cardPadding: 'p-3',
    cardHeaderPadding: 'p-2',
    sectionSpacing: 'gap-3',
    buttonPadding: 'px-4 py-2',
  },

  // Button styles
  buttons: {
    primary: 'bg-blue-700 hover:bg-blue-800 text-white',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-gray-900',
    accent: 'bg-teal-600 hover:bg-teal-700 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    size: 'text-sm px-4 py-2',
  },

  // Input styles - Fix white text issue
  inputs: {
    base: 'bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500',
    disabled: 'bg-gray-100 text-gray-500 cursor-not-allowed',
    error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
  },
};

// Brand Configuration
export const brandConfig = {
  name: 'The Field Genie',
  shortName: 'Field Genie',
  tagline: 'AI-powered quote generation for field service contractors',
  description: 'Win more jobs in seconds with intelligent quote automation',
};
