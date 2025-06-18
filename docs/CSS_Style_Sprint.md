# KalySwap Frontend Color Theme Update Sprint

## Overview
The KalySwap frontend needs to be updated from the current blue theme to match the official landing page's dark amber theme exactly. The owner has specified that both the frontend app and landing page must have 100% matching colors and gradients.

## Current State vs Target State

### Current Frontend Theme (Blue-based)
- **Background**: `linear-gradient(135deg, #0f172a 0%, #1e293b 100%)` (blue gradient)
- **Primary Colors**: Blue (`#3b82f6`, `rgba(59, 130, 246, 0.2)`)
- **Cards**: `rgba(30, 58, 138, 0.1)` with blue borders
- **Buttons**: Orange gradient (`#f59e0b` to `#fbbf24`)
- **Borders**: `rgba(59, 130, 246, 0.2)` (blue)

### Target Landing Page Theme (Dark Amber)
- **Background**: `bg-gradient-to-br from-black via-stone-950 to-amber-900`
- **Primary Colors**: Amber (`amber-400`, `amber-500`, `amber-600`)
- **Cards**: `bg-white/10 backdrop-blur-md border-white/20`
- **Buttons**: `bg-gradient-to-r from-amber-500 to-amber-600`
- **Text**: White with `amber-100` for secondary text
- **Borders**: `border-white/20`

## Landing Page Color Analysis

### Key Colors from Landing Page:
```css
/* Backgrounds */
background: bg-gradient-to-br from-black via-stone-950 to-amber-900

/* Cards */
background: bg-white/10 backdrop-blur-md
border: border-white/20
hover: hover:border-amber-500/50

/* Buttons Primary */
background: bg-gradient-to-r from-amber-500 to-amber-600
hover: hover:from-amber-600 hover:to-amber-700

/* Buttons Secondary */
background: bg-white/10 backdrop-blur-md
border: border-white/20
hover: hover:bg-white/20

/* Text Colors */
primary: text-white
secondary: text-amber-100
accent: text-amber-400
muted: text-amber-100/80

/* Dialogs */
background: bg-stone-950
border: border-white/20
text: text-white

/* Footer */
background: bg-black
title: bg-gradient-to-r from-amber-400 to-amber-600 (text gradient)
links: text-amber-100/80
hover: hover:text-amber-400
```

## Implementation Strategy

### Phase 1: Core CSS Variables Update
Update `frontend/src/app/globals.css` root variables:

```css
:root {
  /* Main background - black to amber gradient */
  --background: #000000;
  --foreground: #ffffff;

  /* Cards - white/10 with white borders */
  --card: rgba(255, 255, 255, 0.1);
  --card-foreground: #ffffff;

  /* Popover/dropdown styling */
  --popover: rgba(255, 255, 255, 0.1);
  --popover-foreground: #ffffff;

  /* Primary - amber gradient */
  --primary: #f59e0b; /* amber-500 */
  --primary-foreground: #ffffff;

  /* Secondary - white/10 */
  --secondary: rgba(255, 255, 255, 0.1);
  --secondary-foreground: #ffffff;

  /* Borders - white/20 */
  --border: rgba(255, 255, 255, 0.2);

  /* Input fields - white/10 */
  --input: rgba(255, 255, 255, 0.1);

  /* Accent - amber */
  --accent: #fbbf24; /* amber-400 */
  --accent-foreground: #000000;
}
```

### Phase 2: Background Gradient Update
```css
body {
  background: linear-gradient(135deg, #000000 0%, #1c1917 50%, #92400e 100%);
  /* Equivalent to: from-black via-stone-950 to-amber-900 */
}
```

### Phase 3: Component-Specific Updates

#### Cards
```css
.card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.card:hover {
  border-color: rgba(245, 158, 11, 0.5); /* amber-500/50 */
}
```

#### Buttons
```css
/* Primary Buttons - Amber Gradient */
.btn-primary {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  /* from-amber-500 to-amber-600 */
}

.btn-primary:hover {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  /* from-amber-600 to-amber-700 */
}

/* Secondary Buttons - White/10 */
.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}
```

#### Inputs
```css
.input {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
}

.input:focus {
  border-color: #f59e0b; /* amber-500 */
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}
```

### Phase 4: Dialog Components
Update all dialog components to use solid backgrounds like the landing page:

```css
/* Force solid background for all dialogs */
[data-radix-dialog-content] {
  background: #1c1917 !important; /* stone-950 */
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  backdrop-filter: none !important;
}
```

## Files to Update

### Core CSS Files:
1. `frontend/src/app/globals.css` - Main CSS variables and base styles
2. `frontend/src/app/swaps/swaps.css` - Swap page specific styles
3. `frontend/src/app/pools/pools.css` - Pools page specific styles
4. `frontend/src/app/launchpad/launchpad.css` - Launchpad page specific styles
5. `frontend/src/app/dashboard/dashboard.css` - Dashboard page specific styles
6. `frontend/src/app/bridge/bridge.css` - Bridge page specific styles
7. `frontend/src/app/stake/stake.css` - Staking page specific styles

### Dialog Components Needing Updates:
1. `frontend/src/components/swap/TokenSelectorModal.tsx` ✅ (Already updated)
2. `frontend/src/components/pools/RemoveLiquidityModal.tsx`
3. `frontend/src/components/pools/TokenSelector.tsx`
4. `frontend/src/components/swap/SwapConfirmationModal.tsx`
5. `frontend/src/components/wallet/ConnectWallet.tsx`

## Color Reference

### Tailwind Amber Colors:
- `amber-50`: #fffbeb
- `amber-100`: #fef3c7
- `amber-200`: #fde68a
- `amber-300`: #fcd34d
- `amber-400`: #fbbf24
- `amber-500`: #f59e0b
- `amber-600`: #d97706
- `amber-700`: #b45309
- `amber-800`: #92400e
- `amber-900`: #78350f

### Stone Colors:
- `stone-50`: #fafaf9
- `stone-100`: #f5f5f4
- `stone-200`: #e7e5e4
- `stone-300`: #d6d3d1
- `stone-400`: #a8a29e
- `stone-500`: #78716c
- `stone-600`: #57534e
- `stone-700`: #44403c
- `stone-800`: #292524
- `stone-900`: #1c1917
- `stone-950`: #0c0a09

## Implementation Notes

1. **Maintain Functionality**: Only update colors, don't change component structure
2. **Consistent Branding**: All colors must match the landing page exactly
3. **Glass Morphism**: Keep backdrop-blur effects but with white/10 backgrounds
4. **Gradients**: Use amber gradients instead of blue/orange combinations
5. **Text Hierarchy**: White for primary, amber-100 for secondary, amber-400 for accents

## Testing Checklist

After implementation, verify:
- [ ] All pages match landing page color scheme
- [ ] Dialog backgrounds are solid (not transparent)
- [ ] Button gradients use amber colors
- [ ] Card backgrounds use white/10 with white/20 borders
- [ ] Text is readable with proper contrast
- [ ] Hover states use amber colors
- [ ] All components maintain functionality

## Current Status

- ✅ TokenSelectorModal dialog background fixed (solid dark background)
- ⏳ Awaiting full color scheme implementation
- ⏳ Need to update all CSS files with amber theme
- ⏳ Need to update remaining dialog components