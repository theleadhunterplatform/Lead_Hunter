import { PrismaClient } from '../frontend/apps/web/node_modules/@prisma/client/default.js'

const prisma = new PrismaClient()

// Test extractLeadBadges logic
const VALID_SKILL_KEYWORDS = [
  { key: 'next.js', label: 'Next.js' },
  { key: 'nextjs', label: 'Next.js' },
  { key: 'react native', label: 'React Native' },
  { key: 'react', label: 'React' },
  { key: 'typescript', label: 'TypeScript' },
  { key: 'javascript', label: 'JavaScript' },
  { key: 'tailwind', label: 'Tailwind CSS' },
  { key: 'vue', label: 'Vue.js' },
  { key: 'angular', label: 'Angular' },
  { key: 'html/css', label: 'HTML/CSS' },
  { key: 'redux', label: 'Redux' },
  { key: 'node.js', label: 'Node.js' },
  { key: 'nodejs', label: 'Node.js' },
  { key: 'node', label: 'Node.js' },
  { key: 'express', label: 'Express' },
  { key: 'mongodb', label: 'MongoDB' },
  { key: 'mongo', label: 'MongoDB' },
  { key: 'postgres', label: 'PostgreSQL' },
  { key: 'postgresql', label: 'PostgreSQL' },
  { key: 'mysql', label: 'MySQL' },
  { key: 'supabase', label: 'Supabase' },
  { key: 'firebase', label: 'Firebase' },
  { key: 'graphql', label: 'GraphQL' },
  { key: 'rest api', label: 'REST API' },
  { key: 'prisma', label: 'Prisma' },
  { key: 'wordpress', label: 'WordPress' },
  { key: 'woocommerce', label: 'WooCommerce' },
  { key: 'shopify', label: 'Shopify' },
  { key: 'elementor', label: 'Elementor' },
  { key: 'webflow', label: 'Webflow' },
  { key: 'wix', label: 'Wix' },
  { key: 'squarespace', label: 'Squarespace' },
  { key: 'magento', label: 'Magento' },
  { key: 'python', label: 'Python' },
  { key: 'django', label: 'Django' },
  { key: 'fastapi', label: 'FastAPI' },
  { key: 'php', label: 'PHP' },
  { key: 'laravel', label: 'Laravel' },
  { key: 'flutter', label: 'Flutter' },
  { key: 'swift', label: 'Swift' },
  { key: 'ios', label: 'iOS' },
  { key: 'android', label: 'Android' },
  { key: 'docker', label: 'Docker' },
  { key: 'aws', label: 'AWS' },
  { key: 'figma', label: 'Figma' },
  { key: 'ui/ux', label: 'UI/UX' },
  { key: 'ui ux', label: 'UI/UX' },
  { key: 'seo', label: 'SEO' },
  { key: 'b2b saas', label: 'B2B SaaS' },
  { key: 'saas', label: 'SaaS' },
  { key: 'automation', label: 'Automation' },
  { key: 'ai', label: 'AI' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'branding', label: 'Branding' },
  { key: 'copywriting', label: 'Copywriting' },
  { key: 'consulting', label: 'Consulting' },
]

function extractSection(text, heading) {
  if (!text) return ''
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`#+\\s*[^\\n]*?${escaped}[^\\n]*?\\n+([\\s\\S]*?)(?:\\n#+\\s|---|\$)`, 'i')
  const match = text.match(regex)
  return match ? match[1].replace(/^[\\s\-*#—]+|[\\s\-*#—]+$/g, '').trim() : ''
}

function extractLeadBadges(post, leadNiches) {
  const intel = post.intelligence || ''
  const aiBadgesText = extractSection(intel, 'Badges')
  if (aiBadgesText) {
    const parsed = aiBadgesText
      .split(/[,;\n•*]+/)
      .map((t) => t.trim().replace(/^[-*•\s]+|[-*•\s]+$/g, ''))
      .filter((t) => t.length >= 2 && t.length <= 25 && !t.toLowerCase().includes('badge'))

    if (parsed.length > 0) {
      return Array.from(new Set(parsed)).slice(0, 4)
    }
  }

  const textCorpus = [
    post.keyword || '',
    post.content || '',
    post.intelligence || '',
  ].join(' ').toLowerCase()

  const matchedTags = []
  for (const { key, label } of VALID_SKILL_KEYWORDS) {
    const regex = new RegExp(`\\b${key.replace('.', '\\.')}\\b`, 'i')
    if (regex.test(textCorpus) && !matchedTags.includes(label)) {
      matchedTags.push(label)
    }
    if (matchedTags.length >= 4) break
  }

  if (matchedTags.length === 0 && leadNiches && leadNiches.length > 0) {
    for (const niche of leadNiches) {
      if (!matchedTags.includes(niche)) matchedTags.push(niche)
    }
  }
  return Array.from(new Set(matchedTags)).slice(0, 4)
}

async function main() {
  const posts = await prisma.leadPost.findMany({
    where: { review_status: 'approved', is_deleted: false },
    take: 5,
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      title: true,
      keyword: true,
      niche: true,
      intelligence: true,
      content: true,
    }
  })

  for (const p of posts) {
    const badges = extractLeadBadges(p, [p.niche])
    console.log('Title:', p.title)
    console.log('Badges:', badges)
  }
}

main().finally(() => prisma.$disconnect())
