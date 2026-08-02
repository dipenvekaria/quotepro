# Theme Management System

## ✅ Centralized Theme Configuration

**Location:** `src/config/theme.ts`

This is your **single source of truth** for all theme values.

## How It Works

### 1. CSS Variables (globals.css)
Defines base Tailwind semantic colors:
- `--primary` → Slate-900 (#0f172a)
- `--accent` → Blue-600 (#2563eb)
- `--border` → Slate-400 (strong borders)

### 2. TypeScript Config (theme.ts)
Provides:
- ✅ **Type safety** - IntelliSense autocomplete
- ✅ **Helper functions** - `getButtonClasses()`, `getBadgeClasses()`
- ✅ **Pre-built combinations** - No manual class mixing
- ✅ **Single source of truth** - Change once, applies everywhere

## Usage Guide

### Option 1: Direct Theme Values (Simple)

```tsx
import { theme } from '@/config/theme';

// Colors
<div className={theme.colors.primary.bg}>Dark background</div>
<button className={theme.colors.accent.bg}>Blue button</button>

// Typography
<h1 className={`${theme.typography.h1.size} ${theme.typography.h1.weight}`}>
  Heading
</h1>

// Spacing
<div className={theme.spacing.card.padding}>Card content</div>
```

### Option 2: Helper Functions (Recommended)

```tsx
import { getButtonClasses, getBadgeClasses, getCardClasses } from '@/config/theme';

// Buttons
<button className={getButtonClasses('primary')}>Save</button>
<button className={getButtonClasses('danger')}>Delete</button>

// Badges
<span className={getBadgeClasses('success')}>Active</span>
<span className={getBadgeClasses('warning')}>Pending</span>

// Cards
<div className={getCardClasses(true)}>Hover effect card</div>
```

### Option 3: Component Library (Best)

```tsx
// Create reusable components that use theme internally

// components/ui/themed-button.tsx
import { getButtonClasses } from '@/config/theme';

export function ThemedButton({ 
  variant = 'primary', 
  children 
}: { 
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  children: React.ReactNode;
}) {
  return (
    <button className={getButtonClasses(variant)}>
      {children}
    </button>
  );
}

// Use it
<ThemedButton variant="primary">Click Me</ThemedButton>
```

## Current Theme: Executive Black + Professional Bold (90%)

### Colors
- **Primary**: Slate-900 (#0f172a) - Authority, professionalism
- **Accent**: Blue-600 (#2563eb) - Interactive elements, CTAs
- **Borders**: Slate-400 - Strong, visible borders

### Typography (10% reduction from Professional Bold)
- **Display**: 48px (was 60px)
- **H1**: 27px (was 30px)
- **H2**: 18px (was 20px)
- **H3**: 16px (was 18px)
- **Body**: 14px (was 16px)
- **Small**: 13px (was 14px)
- **Tiny**: 11px (was 12px)

All text is **font-medium** or **font-bold** for professional impact.

## Migration Strategy

### Phase 1: New Components (Start Here)
Use theme system for ALL new components:
```tsx
import { theme, getButtonClasses } from '@/config/theme';

export function NewComponent() {
  return (
    <div className={theme.spacing.card.padding}>
      <h2 className={`${theme.typography.h2.size} ${theme.typography.h2.weight}`}>
        Title
      </h2>
      <button className={getButtonClasses('primary')}>
        Action
      </button>
    </div>
  );
}
```

### Phase 2: Existing Components (As Needed)
Update components when you touch them:

**Before:**
```tsx
<button className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 py-2 rounded-lg">
  Save
</button>
```

**After:**
```tsx
import { getButtonClasses } from '@/config/theme';

<button className={getButtonClasses('primary')}>
  Save
</button>
```

### Phase 3: Semantic Tokens (Automatic)
Components already using Tailwind's semantic colors get the new theme automatically:
- `bg-primary` → Slate-900 ✅
- `bg-accent` → Blue-600 ✅
- `border-border` → Slate-400 ✅
- `ring-ring` → Blue-600 ✅

## Changing the Theme

### To change colors:

1. **Edit `src/config/theme.ts`:**
```ts
colors: {
  accent: {
    bg: 'bg-purple-600',  // Changed from blue
    DEFAULT: '#9333ea',
  }
}
```

2. **Edit `src/app/globals.css`:**
```css
--accent: oklch(0.5 0.2 300); /* Purple instead of blue */
```

3. Done! All components using theme automatically update.

### To change typography:

**Edit `src/config/theme.ts`:**
```ts
typography: {
  body: {
    size: 'text-base',  // Larger body text
    weight: 'font-normal', // Lighter weight
  }
}
```

**Edit `src/app/globals.css`:**
```css
p {
  @apply text-base font-normal leading-relaxed;
}
```

## Benefits

✅ **No more scattered colors** - Everything in one place  
✅ **Type safety** - IntelliSense shows all options  
✅ **Easy updates** - Change once, applies everywhere  
✅ **Consistent spacing** - Predefined scales  
✅ **Reusable patterns** - Pre-built component styles  
✅ **Easy migration** - Gradual adoption, no big-bang changes  

## Example: Updating a Component

**Old way (scattered, brittle):**
```tsx
<button className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-4 py-2 rounded-lg shadow-sm transition-colors">
  Click me
</button>
```

**New way (centralized, maintainable):**
```tsx
import { getButtonClasses } from '@/config/theme';

<button className={getButtonClasses('primary')}>
  Click me
</button>
```

Want to change ALL primary buttons from blue to purple? Edit **one line** in `theme.ts`. 🎯

---

**Theme Applied:** Executive Black + Professional Bold (90% scale)  
**Last Updated:** December 2, 2025
