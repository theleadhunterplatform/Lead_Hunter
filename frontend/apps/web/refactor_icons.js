const fs = require('fs')
const path = require('path')

const ICON_MAP = {
  Rss: 'TokensIcon',
  Bookmark: 'BookmarkIcon',
  Send: 'PaperPlaneIcon',
  LayoutDashboard: 'DashboardIcon',
  Coins: 'TokensIcon',
  Sparkles: 'MagicWandIcon',
  ArrowRight: 'ArrowRightIcon',
  Target: 'TargetIcon',
  MessageSquare: 'ChatBubbleIcon',
  Zap: 'LightningBoltIcon',
  ArrowUpRight: 'ArrowTopRightIcon',
  TrendingUp: 'BarChartIcon',
  ShieldCheck: 'CheckCircledIcon',
  Filter: 'MixerHorizontalIcon',
  Search: 'MagnifyingGlassIcon',
  Clock: 'ClockIcon',
  Activity: 'ActivityLogIcon',
  ShieldAlert: 'ExclamationTriangleIcon',
  User: 'PersonIcon',
  MoreHorizontal: 'DotsHorizontalIcon',
  Info: 'InfoCircledIcon',
  ExternalLink: 'ExternalLinkIcon',
  Eye: 'EyeOpenIcon',
  EyeOff: 'EyeNoneIcon',
  Lock: 'LockClosedIcon',
  ChevronRight: 'ChevronRightIcon',
  Mail: 'EnvelopeClosedIcon',
  RefreshCw: 'UpdateIcon',
  X: 'Cross2Icon',
  Command: 'CodeIcon',
  ChevronDown: 'ChevronDownIcon',
  Brain: 'GlobeIcon',
  Menu: 'HamburgerMenuIcon',
  Star: 'StarIcon',
}

function walk(dir) {
  let results = []
  const list = fs.readdirSync(dir)
  list.forEach((file) => {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath))
    } else {
      if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
        results.push(fullPath)
      }
    }
  })
  return results
}

const files = walk(path.join(__dirname, 'src'))

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8')
  let original = content

  // 1. Replace lucide-react imports
  content = content.replace(
    /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/g,
    (match, imports) => {
      const icons = imports
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean)
      const radixIcons = icons.map((i) => {
        const iconName = i.split(' as ')[0].trim()
        return ICON_MAP[iconName] || 'DotFilledIcon' // Fallback
      })
      // Radix has no default export, just named exports
      return `import { ${[...new Set(radixIcons)].join(', ')} } from '@radix-ui/react-icons'`
    },
  )

  // 2. Replace the actual component tags
  for (const [lucide, radix] of Object.entries(ICON_MAP)) {
    // Replace <LucideIcon ...> with <RadixIcon ...>
    const regexTagOpen = new RegExp(`<${lucide}\\b`, 'g')
    content = content.replace(regexTagOpen, `<${radix}`)

    const regexTagClose = new RegExp(`</${lucide}>`, 'g')
    content = content.replace(regexTagClose, `</${radix}>`)

    // Replace references in arrays/objects like { icon: LucideIcon }
    const regexRef1 = new RegExp(`\\bicon:\\s*${lucide}\\b`, 'g')
    content = content.replace(regexRef1, `icon: ${radix}`)
  }

  // 3. Strip colorful icon container classes
  // Replace bg-accent-*/10 or text-accent-* with monochromatic colors
  content = content.replace(/\bbg-accent-[a-z]+\/[0-9]+\b/g, 'bg-surface-secondary')
  content = content.replace(/\bborder-accent-[a-z]+\/[0-9]+\b/g, 'border-border-subtle')
  content = content.replace(
    /\btext-accent-[a-z]+\b/g,
    'text-text-secondary hover:text-text-primary transition-colors',
  )

  // Replace large rounded boxes (e.g. w-12 h-12 rounded-full) with minimal ones
  content = content.replace(/w-12 h-12 rounded-full|w-10 h-10 rounded-xl/g, 'w-8 h-8 rounded-md')

  // Strip box-shadows related to glow
  content = content.replace(/shadow-\[0_0_[^\]]+\]/g, '')

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8')
    console.log(`Updated ${file}`)
  }
}
