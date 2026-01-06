# Production Readiness

## Overview
This document outlines the configurations and assets implemented to ensure the application is production-ready, focusing on branding, SEO (Search Engine Optimization), and PWA (Progressive Web App) capabilities.

## Architecture
- **Config Files:** `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/manifest.ts`
- **Assets:** `src/app/opengraph-image.tsx`, `src/app/icon.png`, `src/app/apple-icon.png`
- **Layout:** `src/app/layout.tsx`

## Key Components

### Branding Assets
- **Favicons:** `icon.png` and `apple-icon.png` (using `light.png` source).
- **OpenGraph Image:** Dynamic generation via `opengraph-image.tsx`.
  - **Logic:** Uses `@vercel/og` to render a custom banner with the user's logo (`dark.png`), a gradient background, and dynamic text.
  - **Output:** A 1200x630 PNG served at `/opengraph-image`.

### SEO Configuration
- **Sitemap (`sitemap.ts`):** dynamically generates `sitemap.xml` listing key routes (`/`, `/login`, `/pricing`).
- **Robots (`robots.ts`):** generates `robots.txt` allowing all agents but disallowing `/private/`, and pointing to the sitemap.
- **Metadata (`layout.tsx`):**
  - **Title Template:** `%s | J-Star FYB`
  - **Canonical URL:** `https://fyb.jstarstudios.com`
  - **Rich Tags:** OpenGraph and Twitter Card metadata configured for social sharing.

### PWA Support
- **Manifest (`manifest.ts`):** Generates `manifest.webmanifest` defining the app name, theme colors (`#000000`), and icons for installation on devices.

## Configuration
| File | Purpose | Key Value |
|------|---------|-----------|
| `layout.tsx` | Global Metadata | `metadataBase: new URL("https://fyb.jstarstudios.com")` |
| `sitemap.ts` | Route Discovery | `baseUrl = 'https://fyb.jstarstudios.com'` |

## Hotfixes / Changelog
### 2026-01-06: Initial Production Setup
- **Feature:** Added full SEO and Branding suite.
- **Detail:** Implemented dynamic OpenGraph images, favicons, sitemap, robots, and PWA manifest.
