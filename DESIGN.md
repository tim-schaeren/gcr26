---
name: grand-city-race-design-system
description: Design system for Grand City Race 2026 - a location-based scavenger hunt app with claymorphic 3D aesthetic. Use when generating UI components, screens, or visual assets for the mobile app or admin panel.
version: "1.0"
license: MIT
compatibility: React Native (Expo), React + Tailwind CSS, Firebase
metadata:
  author: gcr26-team
  aesthetic: "3D Stickle / Claymorphism"
  illustration_source: "Icons8"
---

# Grand City Race 2026 Design System

## Visual Identity

Grand City Race uses a **playful, friendly claymorphic 3D aesthetic** inspired by the 3D Stickle illustration style. The design feels approachable and game-like while maintaining clarity and usability.

### Core Aesthetic Principles

- **Geometry**: Simplified proportions with chunky volumes and soft, uniformly rounded edges
- **Materials**: Smooth, soft-touch matte surfaces with muted brushed metallic finishes
- **Surface Graphics**: Flat, vibrantly colored 2D vector decals surface-mapped onto 3D models
- **Color Palette**: Cheerful, pastel-dominant base with saturated accent colors from decals
- **Lighting**: Clean, high-key studio lighting with soft diffused drop shadows
- **Background**: Pure white (#FFFFFF) for clean isolation

## Design Tokens

### Colors

#### Primary Colors
- **Grayish Lavender** (`#A294C8`) - Primary brand color, main CTAs, navigation highlights
- **Dark Slate Purple** (`#74325C`) - Secondary brand color, text headings, important accents

#### Accent Colors
- **Eosine Pink** (`#F3A0AA`) - Success states, celebrations, rewards, positive feedback
- **Khaki** (`#AD7207`) - Warnings, important notices, skill unlocks

#### Neutral Colors
- **White** (`#FFFFFF`) - Backgrounds, cards, clean surfaces
- **Light Gray** (`#F5F5F5`) - Secondary backgrounds, dividers
- **Medium Gray** (`#888888`) - Secondary text, icons, disabled states
- **Dark Gray** (`#111111`) - Primary text, strong contrast elements

#### Pastel Colors
- **Soft Lavender** (`#E8E4F0`) - Subtle backgrounds, soft overlays
- **Soft Pink** (`#FCE4E8`) - Gentle highlights, reward backgrounds
- **Soft Yellow** (`#F5E6D0`) - Warm accents, skill highlights

### Typography

#### Font Families
- **Primary**: System UI, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- **Philosophy**: Keep it simple and native - no custom fonts

#### Font Weights
- Light: 300
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

#### Font Sizes
- XS: 12px
- SM: 14px
- Base: 16px
- LG: 18px
- XL: 24px
- 2XL: 32px
- 3XL: 48px
- 4XL: 64px

#### Line Heights
- Tight: 1.2
- Normal: 1.5
- Relaxed: 1.75

#### Letter Spacing
- Normal: 0
- Wide: 0.05em
- Wider: 0.1em

### Spacing

#### Scale
- 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px, 96px

#### Border Radius
- SM: 8px
- MD: 12px
- LG: 16px
- XL: 24px
- Full: 9999px

### Shadows

#### Soft Shadows
- `0 2px 8px rgba(0, 0, 0, 0.08)`
- `0 4px 16px rgba(0, 0, 0, 0.12)`

#### Medium Shadows
- `0 4px 12px rgba(0, 0, 0, 0.1)`
- `0 8px 24px rgba(0, 0, 0, 0.15)`

#### Strong Shadows
- `0 8px 24px rgba(0, 0, 0, 0.15)`
- `0 16px 48px rgba(0, 0, 0, 0.2)`

### Animation

#### Durations
- Fast: 150ms
- Normal: 300ms
- Slow: 500ms

#### Easings
- Ease: `cubic-bezier(0.4, 0, 0.2, 1)`
- Ease In: `cubic-bezier(0.4, 0, 1, 1)`
- Ease Out: `cubic-bezier(0, 0, 0.2, 1)`
- Bouncy: `cubic-bezier(0.68, -0.55, 0.265, 1.55)`

## Illustration Style

### 3D Stickle / Claymorphism Specifications

- **Geometry**: Simplified proportions, chunky volumes, soft rounded edges
- **Materials**: Smooth matte surfaces, muted brushed metallic finishes
- **Surface Graphics**: Flat 2D vector decals surface-mapped onto 3D models
- **Lighting**: Clean high-key studio lighting, soft diffused drop shadows
- **Background**: Pure white (#FFFFFF)
- **Source**: Icons8 3D Stickle illustrations (https://icons8.com/illustrations)

### Usage Guidelines

- Use for hero illustrations, empty states, and reward celebrations
- Maintain white background isolation
- Prefer animated versions (GIF/Lottie) for interactive moments
- Scale appropriately for mobile screens

## Component Patterns

### Buttons

#### Primary Button
- Background: Grayish Lavender (#A294C8)
- Text: White
- Border Radius: 16px (LG)
- Shadow: Soft
- Padding: 12px 24px

#### Secondary Button
- Background: White
- Text: Dark Slate Purple (#74325C)
- Border: 1px solid Grayish Lavender
- Border Radius: 16px (LG)
- Shadow: Soft
- Padding: 12px 24px

#### Accent Button
- Background: Eosine Pink (#F3A0AA)
- Text: White
- Border Radius: 16px (LG)
- Shadow: Medium
- Padding: 12px 24px

### Cards

- Background: White
- Border Radius: 16px (LG)
- Shadow: Soft
- Padding: 24px
- Border: 1px solid Light Gray (#F5F5F5)

### Inputs

- Background: White
- Border: 1px solid Light Gray (#F5F5F5)
- Border Radius: 12px (MD)
- Padding: 12px 16px
- Focus Border: Grayish Lavender (#A294C8)
- Focus Shadow: `0 0 0 3px rgba(162, 148, 200, 0.2)`

### Badges

- Background: Soft Lavender (#E8E4F0)
- Text: Dark Slate Purple (#74325C)
- Border Radius: Full
- Padding: 4px 12px
- Font Size: 12px (XS)
- Font Weight: 500 (Medium)

## Layout System

### Container
- Max Width: 1200px
- Padding: 24px

### Sections
- Vertical Spacing: 64px
- Horizontal Spacing: 32px

### Grid
- Columns: 12
- Gap: 24px

## Platform-Specific Guidelines

### Mobile App (React Native)

- Use native system fonts
- Implement haptic feedback for interactions
- Optimize illustrations for mobile screen sizes
- Ensure touch targets are at least 44px
- Use safe area insets for modern devices

### Admin Panel (React + Tailwind)

- Follow Tailwind utility class patterns
- Maintain consistent spacing scale
- Use responsive breakpoints (sm, md, lg, xl)
- Ensure keyboard accessibility
- Test on common screen sizes

## Design Philosophy

This design system is a **foundation, not a prescription**. It provides a common ground for agents, tools, and teams while preserving freedom to extend for domain-specific needs. Unknown sections and custom tokens are accepted, not rejected.

The system emphasizes:
- **Playfulness**: Friendly, approachable aesthetic
- **Clarity**: Clear visual hierarchy and readable typography
- **Consistency**: Reusable patterns across platforms
- **Accessibility**: Sufficient contrast and touch targets
- **Performance**: Optimized illustrations and animations
