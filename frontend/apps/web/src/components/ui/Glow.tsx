type GlowColor = 'mint' | 'purple'
type GlowIntensity = 'very-faint' | 'soft' | 'medium' | 'strong' | 'intense'

interface GlowProps {
  color?: GlowColor
  intensity?: GlowIntensity
  className?: string
}

const glowClassMap: Record<GlowColor, Record<GlowIntensity, string>> = {
  mint: {
    'very-faint': 'glow-purple-very-faint',
    soft: 'glow-purple-soft',
    medium: 'glow-purple-soft',
    strong: 'glow-purple-strong',
    intense: 'glow-purple-strong',
  },
  purple: {
    'very-faint': 'glow-purple-very-faint',
    soft: 'glow-purple-soft',
    medium: 'glow-purple-medium',
    strong: 'glow-purple-strong',
    intense: 'glow-purple-intense',
  },
}

export function Glow({ color = 'mint', intensity = 'soft', className = '' }: GlowProps) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none ${glowClassMap[color][intensity]} ${className}`}
    />
  )
}
