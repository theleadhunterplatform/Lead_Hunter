/**
 * Lead Hunter Club — "Obsidian Kinetic" Design Tokens
 *
 * A Material Design 3-style dark system built around the palette below.
 *
 * Roles:
 *  - PRIMARY  = kinetic amber (CTAs, focal accents, active states, glows)  #ffb800
 *  - SECONDARY= living mint-green (signals, verified, success, energy)      #43ed9e / #00d084
 *  - TERTIARY = scan-cyan (info, technical, persona-blue)                   #abebff / #00d7fe
 *  - ERROR    = salmon (#ffb4ab) — errors and strong warnings only
 *  - SURFACES = full obsidian elevation ladder (container-lowest → highest)
 *
 * Legacy aliases (accent-mint/purple/…, surface, text-*, canvas-deeper) are
 * remapped onto the new roles so existing components keep working while
 * inheriting the new look.
 */

// ─── Obsidian surface ladder (Material 3) ──────────────────────────────────
export const surface = {
  DEFAULT: '#121314',
  dim: '#121314',
  bright: '#39393a',
  'container-lowest': '#0d0e0f',
  'container-low': '#1b1c1d',
  container: '#1f2021',
  'container-high': '#292a2b',
  'container-highest': '#343536',
} as const

export const onSurface = {
  DEFAULT: '#e3e2e3',
  variant: '#d5c4ab',
} as const

export const outline = {
  DEFAULT: '#9e8f78',
  variant: '#514532',
} as const

export const inverseSurface = {
  surface: '#e3e2e3',
  'on-surface': '#303031',
  tint: '#ffba20',
} as const

export const background = {
  DEFAULT: '#121314',
  on: '#e3e2e3',
} as const

// ─── Kinetic amber — PRIMARY ────────────────────────────────────────────────
export const primary = {
  DEFAULT: '#ffb800',
  on: '#412d00',
  container: '#ffb800',
  onContainer: '#6b4c00',
  inverse: '#7c5800',
  fixed: '#ffdea8',
  fixedDim: '#ffba20',
  onFixed: '#271900',
  onFixedVariant: '#5e4200',
} as const

// ─── Living mint-green — SECONDARY ─────────────────────────────────────────
export const secondary = {
  DEFAULT: '#43ed9e',
  on: '#003920',
  container: '#00d084',
  onContainer: '#005231',
  fixed: '#59fead',
  fixedDim: '#31e193',
  onFixed: '#002111',
  onFixedVariant: '#005231',
} as const

// ─── Scan cyan — TERTIARY ──────────────────────────────────────────────────
export const tertiary = {
  DEFAULT: '#abebff',
  on: '#003641',
  container: '#00d7fe',
  onContainer: '#005a6b',
  fixed: '#b0ecff',
  fixedDim: '#17d8ff',
  onFixed: '#001f27',
  onFixedVariant: '#004e5d',
} as const

// ─── Salmon — ERROR ────────────────────────────────────────────────────────
export const error = {
  DEFAULT: '#ffb4ab',
  on: '#690005',
  container: '#93000a',
  onContainer: '#ffdad6',
} as const

// Legacy neutral-scale building blocks (kept for alias wiring below)
export const canvas = {
  DEFAULT: surface.DEFAULT,
  deeper: surface['container-lowest'],
  dim: surface['container-low'],
  surface: surface['container-low'],
  secondary: surface.container,
  elevated: surface['container-high'],
  bright: surface['container-highest'],
} as const

// Code-editor surfaces (recessed obsidian)
export const code = {
  bg: surface['container-low'],
  'bg-dark': surface['container-lowest'],
  header: surface.container,
} as const

export const border = {
  subtle: 'rgba(230, 224, 225, 0.08)',
} as const

// Semantic accent aliases → new roles
//  mint   → secondary (living green: signals, verified, success)
//  purple → primary (kinetic amber: focal, active, highlights)
//  cyan   → tertiary (scan cyan: info, technical)
//  orange → primary-container (vivid amber: warm warnings / urgency)
//  pink   → error (salmon: status)
export const accent = {
  mint: secondary.DEFAULT,
  purple: primary.DEFAULT,
  cyan: tertiary.DEFAULT,
  orange: primary.container,
  pink: error.DEFAULT,
} as const

// Persona identity colors (lead differentiation, never decorative)
export const persona = {
  green: secondary.container,
  blue: tertiary.container,
  pink: error.DEFAULT,
  orange: primary.DEFAULT,
  purple: primary.fixedDim,
} as const

export const status = {
  amber: '#FFBD2E',
  'orange-deep': primary.container,
} as const

// macOS chrome dots
export const dot = {
  red: '#FF5F57',
  yellow: '#FEBC2E',
  green: '#28C840',
} as const

// Social brand marks (exempt from theme)
export const social = {
  twitter: '#1DA1F2',
  linkedin: '#0A66C2',
  reddit: '#FF4500',
} as const

export const text = {
  primary: onSurface.DEFAULT,
  secondary: onSurface.variant,
  muted: outline.DEFAULT,
  'on-accent': '#11150C',
  'on-surface': onSurface.DEFAULT,
  'on-surface-variant': onSurface.variant,
  on: onSurface.DEFAULT,
} as const

// RGB triplets for rgba() usage in inline styles / glows
export const rgb = {
  white: '255, 255, 255',
  black: '0, 0, 0',
  'accent-mint': '67, 237, 158',
  'accent-purple': '255, 184, 0',
  'accent-orange': '255, 184, 0',
  'accent-cyan': '171, 235, 255',
  'accent-pink': '255, 180, 171',
  primary: '255, 184, 0',
  'primary-container': '255, 184, 0',
  secondary: '67, 237, 158',
  'secondary-container': '0, 208, 132',
  tertiary: '171, 235, 255',
  'tertiary-container': '0, 215, 254',
  error: '255, 180, 171',
  'persona-green': '0, 208, 132',
  'persona-blue': '0, 215, 254',
  'persona-pink': '255, 180, 171',
  'persona-orange': '255, 184, 0',
  'persona-purple': '255, 186, 32',
  'tab-purple': '255, 184, 0',
  'badge-amber': '255, 189, 46',
  'orange-deep': '255, 184, 0',
  'social-twitter': '29, 161, 242',
  'on-surface-variant': '213, 196, 171',
} as const

// Tailwind color palette (exposed as bg-/text-/border- utilities)
export const palette = {
  // Material 3 roles (proper design vocabulary)
  'surface-tint': inverseSurface.tint,
  background: background.DEFAULT,
  'on-background': background.on,
  surface: surface['container-low'],
  'surface-dim': surface.dim,
  'surface-bright': surface.bright,
  'surface-variant': surface['container-highest'],
  'surface-container-lowest': surface['container-lowest'],
  'surface-container-low': surface['container-low'],
  'surface-container': surface.container,
  'surface-container-high': surface['container-high'],
  'surface-container-highest': surface['container-highest'],
  'on-surface': onSurface.DEFAULT,
  'on-surface-variant': onSurface.variant,
  'inverse-surface': inverseSurface.surface,
  'inverse-on-surface': inverseSurface['on-surface'],
  outline: outline.DEFAULT,
  'outline-variant': outline.variant,
  primary: primary.DEFAULT,
  'on-primary': primary.on,
  'primary-container': primary.container,
  'on-primary-container': primary.onContainer,
  'inverse-primary': primary.inverse,
  secondary: secondary.DEFAULT,
  'on-secondary': secondary.on,
  'secondary-container': secondary.container,
  'on-secondary-container': secondary.onContainer,
  tertiary: tertiary.DEFAULT,
  'on-tertiary': tertiary.on,
  'tertiary-container': tertiary.container,
  'on-tertiary-container': tertiary.onContainer,
  error: error.DEFAULT,
  'on-error': error.on,
  'error-container': error.container,
  'on-error-container': error.onContainer,

  // Legacy aliases → remapped onto the roles above
  'bg-main': surface.DEFAULT,
  'page-bg': surface.DEFAULT,
  'surface-secondary': surface.container,
  'surface-elevated': surface['container-high'],
  'canvas-deeper': surface['container-lowest'],
  'code-bg': code.bg,
  'code-bg-dark': code['bg-dark'],
  'code-header': code.header,
  'border-subtle': border.subtle,
  'accent-mint': accent.mint,
  'accent-purple': accent.purple,
  'accent-cyan': accent.cyan,
  'accent-orange': accent.orange,
  'accent-pink': accent.pink,
  'persona-green': persona.green,
  'persona-blue': persona.blue,
  'persona-pink': persona.pink,
  'persona-orange': persona.orange,
  'tab-purple': primary.DEFAULT,
  'tab-cyan': tertiary.DEFAULT,
  'tab-pink': error.DEFAULT,
  'badge-amber': status.amber,
  'orange-deep': status['orange-deep'],
  'dot-red': dot.red,
  'dot-yellow': dot.yellow,
  'dot-green': dot.green,
  'social-twitter': social.twitter,
  'social-linkedin': social.linkedin,
  'social-reddit': social.reddit,
  'text-primary': text.primary,
  'text-secondary': text.secondary,
  'text-muted': text.muted,
  'text-on-accent': text['on-accent'],
  'text-on-surface': text['on-surface'],
  'text-on-surface-variant': text['on-surface-variant'],
  white: '#FFFFFF',
  black: '#000000',
} as const

export const personaColorMap: Record<string, string> = {
  green: persona.green,
  blue: persona.blue,
  pink: persona.pink,
  purple: persona.purple,
  orange: persona.orange,
} as const

export const accentColorMap: Record<string, string> = {
  mint: accent.mint,
  purple: accent.purple,
  cyan: accent.cyan,
  orange: accent.orange,
  pink: accent.pink,
} as const

export const accentRgbMap: Record<string, string> = {
  mint: rgb['accent-mint'],
  purple: rgb['accent-purple'],
  cyan: rgb['accent-cyan'],
  orange: rgb['accent-orange'],
  pink: rgb['accent-pink'],
} as const

export const cssVars: Record<string, string> = {
  '--accent-mint': accent.mint,
  '--accent-purple': accent.purple,
  '--accent-cyan': accent.cyan,
  '--accent-orange': accent.orange,
  '--accent-pink': accent.pink,
  '--rgb-accent-mint': rgb['accent-mint'],
  '--rgb-accent-purple': rgb['accent-purple'],
  '--rgb-accent-cyan': rgb['accent-cyan'],
  '--rgb-accent-orange': rgb['accent-orange'],
  '--rgb-accent-pink': rgb['accent-pink'],
  '--rgb-primary': rgb.primary,
  '--rgb-primary-container': rgb['primary-container'],
  '--rgb-secondary': rgb.secondary,
  '--rgb-secondary-container': rgb['secondary-container'],
  '--rgb-tertiary': rgb.tertiary,
  '--rgb-tertiary-container': rgb['tertiary-container'],
  '--rgb-error': rgb.error,
  '--rgb-white': rgb.white,
  '--rgb-black': rgb.black,
  '--rgb-persona-green': rgb['persona-green'],
  '--rgb-persona-blue': rgb['persona-blue'],
  '--rgb-persona-pink': rgb['persona-pink'],
  '--rgb-persona-orange': rgb['persona-orange'],
  '--rgb-persona-purple': rgb['persona-purple'],
  '--rgb-tab-purple': rgb['tab-purple'],
  '--rgb-badge-amber': rgb['badge-amber'],
  '--rgb-orange-deep': rgb['orange-deep'],
  '--rgb-social-twitter': rgb['social-twitter'],
  '--rgb-on-surface-variant': rgb['on-surface-variant'],
  '--color-page-bg': surface.DEFAULT,
  '--color-surface': surface['container-low'],
  '--color-surface-secondary': surface.container,
  '--color-surface-elevated': surface['container-high'],
  '--color-border-subtle': border.subtle,
  '--color-primary': primary.DEFAULT,
  '--color-primary-container': primary.container,
  '--color-secondary': secondary.DEFAULT,
  '--color-secondary-container': secondary.container,
  '--color-tertiary': tertiary.DEFAULT,
  '--color-tertiary-container': tertiary.container,
  '--color-error': error.DEFAULT,
  '--color-text-primary': text.primary,
  '--color-text-secondary': text.secondary,
  '--color-text-muted': text.muted,
  '--color-text-on-accent': text['on-accent'],
  '--color-persona-green': persona.green,
  '--color-persona-blue': persona.blue,
  '--color-persona-pink': persona.pink,
  '--color-persona-orange': persona.orange,
  '--color-tab-purple': primary.DEFAULT,
  '--color-badge-amber': status.amber,
  '--color-orange-deep': status['orange-deep'],
  '--color-white': '#FFFFFF',
  '--color-black': '#000000',
  '--color-metallic-start': '#18191b',
  '--color-metallic-mid': '#121314',
  '--color-metallic-end': '#0d0e0f',
  '--color-metallic-start-hover': '#1b1c1d',
  '--color-metallic-mid-hover': '#151617',
} as const

export type PaletteKey = keyof typeof palette