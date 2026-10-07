/**
 * Shared onboarding option lists — used by the onboarding flow and the
 * settings profile editor so both surfaces always offer identical choices.
 */

export interface CategoryGroup {
  id: string
  name: string
  icon: string
  items: string[]
}

export const SERVICE_CATEGORIES: CategoryGroup[] = [
  {
    id: 'dev',
    name: 'Development & Engineering',
    icon: '💻',
    items: [
      'Web Development',
      'Mobile App Development',
      'Software & Full-Stack',
      'AI & Machine Learning',
      'DevOps & Cloud Infrastructure',
      'WordPress & Webflow',
    ],
  },
  {
    id: 'design',
    name: 'Design & Creative',
    icon: '🎨',
    items: [
      'UI/UX & Product Design',
      'Graphic & Brand Identity',
      'Motion Graphics & 3D',
      'Packaging & Print Design',
      'Presentations & Pitch Decks',
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing & Growth',
    icon: '🚀',
    items: [
      'SEO & Organic Growth',
      'Paid Ads (Google / Meta / TikTok)',
      'Social Media Marketing',
      'Email Marketing & Lifecycle',
      'Conversion Rate Optimization (CRO)',
      'Influencer & Affiliate Marketing',
    ],
  },
  {
    id: 'content',
    name: 'Content & Media',
    icon: '✍️',
    items: [
      'Copywriting & Messaging',
      'Content Marketing & SEO Blogs',
      'Video Production & Editing',
      'Podcast & Audio Production',
      'Technical Writing',
    ],
  },
  {
    id: 'sales',
    name: 'Sales & Business Operations',
    icon: '💼',
    items: [
      'Lead Generation & Cold Outreach',
      'Sales Consulting & GTM Strategy',
      'CRM & Workflow Automation',
      'Data Analytics & Business Intelligence',
      'Project Management',
    ],
  },
]

export const CLIENT_NICHE_CATEGORIES: CategoryGroup[] = [
  {
    id: 'tech',
    name: 'Tech & Software',
    icon: '⚡',
    items: [
      'B2B SaaS',
      'AI & DeepTech',
      'Mobile Apps & Marketplaces',
      'FinTech & InsurTech',
      'DevTools & Infrastructure',
    ],
  },
  {
    id: 'commerce',
    name: 'E-Commerce & Retail',
    icon: '🛍️',
    items: [
      'DTC Brands & E-commerce',
      'Amazon & Marketplace Sellers',
      'Fashion, Apparel & Luxury',
      'Food & Beverage / CPG',
    ],
  },
  {
    id: 'professional',
    name: 'Professional & B2B Services',
    icon: '🏢',
    items: [
      'Agencies & Consultancies',
      'Corporate & Enterprise Services',
      'Financial & Legal Services',
      'Logistics & Supply Chain',
    ],
  },
  {
    id: 'real-estate',
    name: 'Real Estate & Construction',
    icon: '🏡',
    items: [
      'Commercial & Residential Real Estate',
      'Property Management & Development',
      'Home Services & Contractors',
      'Architecture & Interior Design',
    ],
  },
  {
    id: 'health-edu',
    name: 'Health, Wellness & Education',
    icon: '🩺',
    items: [
      'Healthcare & Medical Practices',
      'HealthTech & Digital Health',
      'Fitness, Wellness & Beauty',
      'EdTech & Online Learning',
    ],
  },
  {
    id: 'other',
    name: 'Other Sectors',
    icon: '🌐',
    items: [
      'Web3 & Crypto',
      'Non-Profit & Social Impact',
      'Hospitality, Travel & Leisure',
      'Media, Entertainment & Gaming',
      'Other',
    ],
  },
]

export const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner (6-12 months)' },
  { value: 'intermediate', label: 'Intermediate (1-3 years)' },
  { value: 'expert', label: 'Expert (3-6 years)' },
]

export const DISCOVERY_SOURCES = [
  'Twitter / X',
  'LinkedIn',
  'Instagram',
  'Meta Ads (Facebook/Instagram)',
  'Google Search',
  'Google Ads',
  'Friend / Referral',
  'YouTube',
  'TikTok',
  'Discord',
  'Podcast',
  'Newsletter',
  'Facebook Groups',
  'Indie Hackers',
  'Reddit',
  'Product Hunt',
  'Other',
]
