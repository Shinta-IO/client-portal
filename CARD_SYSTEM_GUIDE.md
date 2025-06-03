# Card System Configuration Guide

## Overview

The new Card component system gives you complete control over video backgrounds, blend modes, colors, and styling using Tailwind CSS classes. This allows for individual card customization and proper light/dark mode separation.

## Component Props

```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
  
  // Video background options
  videoSrc?: string;           // Path to video file
  videoOpacity?: string;       // Tailwind opacity class
  videoBlendMode?: string;     // Tailwind mix-blend class with light/dark variants
  
  // Background options  
  bgColor?: string;           // Tailwind background class
  borderColor?: string;       // Tailwind border class
}
```

## Usage Examples

### Basic Card (No Video)
```jsx
<Card className="p-6">
  <h2>Basic Card</h2>
  <p>Content here</p>
</Card>
```

### Card with Video Background
```jsx
<Card 
  className="p-6"
  videoSrc="/card.mp4"
  videoOpacity="opacity-75"
  videoBlendMode="mix-blend-lighten dark:mix-blend-normal"
>
  <h2>Video Card</h2>
  <p>Content with video background</p>
</Card>
```

### Custom Styling Examples

#### Project Cards (Current Implementation)
```jsx
<Card 
  className="p-6 hover:shadow-xl transition-all duration-300"
  videoSrc="/card.mp4"
  videoOpacity="opacity-75"
  videoBlendMode="mix-blend-lighten dark:mix-blend-normal"
  bgColor="bg-white dark:bg-gray-900/80"
  borderColor="border-gray-200 dark:border-gray-700/50"
>
  {/* Project content */}
</Card>
```

#### Dashboard Announcements Card (Blue Theme)
```jsx
<Card 
  videoSrc="/card.mp4"
  videoOpacity="opacity-50" 
  videoBlendMode="mix-blend-overlay dark:mix-blend-lighten"
  bgColor="bg-blue-50 dark:bg-blue-900/20"
  borderColor="border-blue-200 dark:border-blue-700/50"
>
  {/* Announcements content */}
</Card>
```

#### Dashboard Testimonials Card (Purple Theme)
```jsx
<Card 
  videoSrc="/card.mp4"
  videoOpacity="opacity-40" 
  videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
  bgColor="bg-purple-50 dark:bg-purple-900/20"
  borderColor="border-purple-200 dark:border-purple-700/50"
>
  {/* Testimonials content */}
</Card>
```

## Video Configuration Options

### Different Videos Per Card
```jsx
{/* Hero section with main video */}
<Card videoSrc="/hero.mp4" />

{/* Project cards with project-specific video */}
<Card videoSrc="/project-demo.mp4" />

{/* Feature cards with animation */}
<Card videoSrc="/feature-animation.mp4" />
```

### Opacity Variations
```jsx
{/* Subtle background */}
<Card videoOpacity="opacity-25" />

{/* Medium visibility */}
<Card videoOpacity="opacity-50" />

{/* Strong presence */}
<Card videoOpacity="opacity-75" />

{/* Nearly opaque */}
<Card videoOpacity="opacity-90" />
```

## Blend Mode Options

### Light/Dark Mode Combinations

#### For Light Backgrounds
```jsx
// Darkens the background
videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"

// Creates overlay effect  
videoBlendMode="mix-blend-overlay dark:mix-blend-soft-light"

// Subtle coloring
videoBlendMode="mix-blend-color-burn dark:mix-blend-color-dodge"
```

#### For Dark Backgrounds
```jsx
// Brightens dark backgrounds
videoBlendMode="mix-blend-lighten dark:mix-blend-multiply"

// Screen effect
videoBlendMode="mix-blend-screen dark:mix-blend-overlay"

// Color dodge
videoBlendMode="mix-blend-color-dodge dark:mix-blend-color-burn"
```

#### Universal Options
```jsx
// Works well in both modes
videoBlendMode="mix-blend-soft-light"

// Normal blend with dark mode variation
videoBlendMode="mix-blend-normal dark:mix-blend-lighten"
```

## Color Scheme Examples

### Neutral Cards
```jsx
bgColor="bg-white dark:bg-gray-900/80"
borderColor="border-gray-200 dark:border-gray-700/50"
```

### Themed Cards
```jsx
// Blue theme
bgColor="bg-blue-50 dark:bg-blue-900/20"
borderColor="border-blue-200 dark:border-blue-700/50"

// Purple theme  
bgColor="bg-purple-50 dark:bg-purple-900/20"
borderColor="border-purple-200 dark:border-purple-700/50"

// Green theme
bgColor="bg-green-50 dark:bg-green-900/20"
borderColor="border-green-200 dark:border-green-700/50"

// Yellow theme
bgColor="bg-yellow-50 dark:bg-yellow-900/20"
borderColor="border-yellow-200 dark:border-yellow-700/50"
```

### High Contrast
```jsx
bgColor="bg-gray-900 dark:bg-gray-100"
borderColor="border-gray-700 dark:border-gray-300"
```

## Best Practices

### Video Selection
- Use `.mp4` format for best browser compatibility
- Keep videos under 5MB for performance
- Use 1080p or lower resolution
- Ensure videos loop seamlessly
- Consider autoplay policies (muted required)

### Opacity Guidelines
- `opacity-25` to `opacity-40`: Very subtle, text-focused cards
- `opacity-50` to `opacity-60`: Balanced visibility
- `opacity-75` to `opacity-90`: Strong video presence

### Blend Mode Selection
- **Light mode**: `mix-blend-multiply`, `mix-blend-overlay` work well
- **Dark mode**: `mix-blend-lighten`, `mix-blend-screen` enhance visibility
- **Universal**: `mix-blend-soft-light`, `mix-blend-normal` are safe choices

### Performance Considerations
- Don't use video backgrounds on mobile for better performance
- Consider using CSS media queries: `hidden md:block` on video elements
- Lazy load videos that are below the fold

## Future Card Types

This system is designed to be flexible for future card implementations:

```jsx
// Pricing cards
<Card 
  videoSrc="/pricing-bg.mp4"
  bgColor="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20"
  borderColor="border-yellow-200 dark:border-yellow-700/50"
/>

// Feature showcase
<Card 
  videoSrc="/feature-demo.mp4"
  videoBlendMode="mix-blend-screen dark:mix-blend-lighten"
  bgColor="bg-black dark:bg-white"
/>

// Portfolio items
<Card 
  videoSrc="/portfolio-preview.mp4"
  videoOpacity="opacity-90"
  videoBlendMode="mix-blend-overlay"
  bgColor="bg-gray-100 dark:bg-gray-800"
/>
```

## Implementation Notes

- All cards now use the shared `@/components/ui/card` component
- Tailwind classes provide consistency and theme support
- Each card can be individually configured
- Light/dark mode is handled via Tailwind's `dark:` prefix
- Performance is optimized with CSS-only animations 