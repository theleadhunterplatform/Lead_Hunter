import { PrismaClient } from '../frontend/apps/web/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/lead_hunter_dev"
    }
  }
});

const VALID_NICHES = [
  'Web Development',
  'Mobile Development',
  'UI/UX Design',
  'Branding & Design',
  'SEO & Organic Growth',
  'Paid Ads & Marketing',
  'Content & Copywriting',
  'Video Production & Editing',
  'AI & Automation',
  'Sales & Lead Gen',
  'Consulting & Strategy',
];

export function detectNiche(input) {
  const intel = (input.intelligence || '').normalize('NFKD').toLowerCase();
  const c = (input.content || '').normalize('NFKD').toLowerCase();
  const title = (input.title || '').normalize('NFKD').toLowerCase();
  const kw = (input.keyword || '').normalize('NFKD').toLowerCase().replace(/^watchlist:[^\s]+\s*/i, '');
  const givenNiche = (input.niche || '').trim();

  // 1. Check AI Intelligence explicit niche match
  const aiNicheMatch = intel.match(/###\s*(?:🎯)?\s*niche\s*\n+([^\n#\r]+)/i);
  const candidate = aiNicheMatch && aiNicheMatch[1] ? aiNicheMatch[1].replace(/^[#*_\s]+|[#*_\s]+$/g, '').trim().toLowerCase() : '';

  if (candidate) {
    const found = VALID_NICHES.find((v) => v.toLowerCase() === candidate || candidate.includes(v.toLowerCase()));
    if (found) return found;
  }

  // 2. High-precision cluster scan on candidate + intel + content + title (actual post intent beats scraper keyword!)
  const primaryText = `${candidate} ${intel} ${c} ${title}`.trim();

  // Paid Ads & Performance Marketing (High Priority - don't let Web Dev steal ad leads)
  if (/\b(performance marketing|paid ads|facebook ads|fb ads|meta ads|google ads|media buyer|ppc specialist|ppc agency|roas|ad campaigns?|social media marketing|smm|d2c marketing|growth marketing|digital marketing|digital marketer|marketing agency|creative marketing agency|brand activation|event activation|influencer (strategist|marketing|campaign|outreach)|creator campaign|creators for an upcoming|brand campaign|ugc agency)\b/i.test(primaryText)) {
    return 'Paid Ads & Marketing';
  }

  // UI/UX & Product Design
  if (/\b(ui\/ux|ui ux|ux\/ui|figma|product design(er| intern)?|ux design(er| intern)?|ui design(er| intern)?|wirefram(e|ing)|mockups?|user experience|user interface|app design(er)?|(web|website|shopify|webflow) design(er|ing)?|website redesign|landing page design(er)?|landing page redesign|redesign (our|the|a) (website|app|platform)|design system|prototyp(e|ing))\b/i.test(primaryText)) {
    return 'UI/UX Design';
  }

  // SEO & Organic Growth
  if (/\b(seo specialist|seo expert|seo agency|technical seo|on-page seo|off-page seo|backlinks?|search engine optimization|google rank(ing)?|rank on google|organic traffic|serp|link building|geo specialist|ahrefs|semrush|search console)\b/i.test(primaryText)) {
    return 'SEO & Organic Growth';
  }

  // Video Production & Editing
  if (/\b(video edit(or|ing)?|motion graphics|reels edit(or|ing)?|tiktok edit(or|ing)?|youtube edit(or|ing)?|animator|2d animat(or|ion)|3d animat(or|ion)|character animat(or|ion)|motion designer|premiere pro|after effects|video production|videographer|video creator|ugc video|video thumbnail|thumbnail designer)\b/i.test(primaryText)) {
    return 'Video Production & Editing';
  }

  // Branding & Graphic Design
  if (/\b(brand identity|branding agency|logo design(er)?|graphic design(er)?|packaging design|brand guidelines|visual identity|illustrat(or|ion)|brochure design|creative director|brand experience)\b/i.test(primaryText)) {
    return 'Branding & Design';
  }

  // Content & Copywriting
  if (/\b(copywrit(er|ing)|content writ(er|ing)|technical writ(er|ing)|newsletter writ(er|ing)|ghostwrit(er|ing)|scriptwrit(er|ing)|blog writ(er|ing)|email copy(writer)?)\b/i.test(primaryText)) {
    return 'Content & Copywriting';
  }

  // Mobile Development
  if (/\b(mobile app( developer)?|ios (app|developer)|android (app|apk|developer)|apk developer|react native|flutter( developer)?|swiftui?|swift developer|kotlin developer|xcode|pos development|pos application)\b/i.test(primaryText)) {
    return 'Mobile Development';
  }

  // AI & Automation
  if (/\b(ai agent|workflow automation|n8n|zapier|make\.com|chatbot|langchain|rag|ai developer|ai automation|prompt engineer|fine-tuning llm|openai api|ai implementation|ai partners?|ai work|zoho|hubspot|crm implementation|data engineer(ing)?|scraper|scraping|data pipeline)\b/i.test(primaryText)) {
    return 'AI & Automation';
  }

  // Sales & Lead Generation
  if (/\b(lead gen(eration)?|cold outreach|appointment setter|cold email|b2b sales|b2b leads|sales rep|sdr|bdr|business development rep|lead list|apollo\.io|cold calling|telemarketing|sales executive)\b/i.test(primaryText)) {
    return 'Sales & Lead Gen';
  }

  // Web Development
  if (
    /\b(web dev(elop(er|ers|ment)?)?|website dev(elop(er|ers|ment)?)?|frontend( developer| developers)?|front-end|backend( developer| developers)?|back-end|fullstack|full-stack|next\.?js|react\.?js|react developer|vue|angular|node\.?js|express\.?js|django|flask|laravel|php developer|wordpress|elementor|divi|divibuilder|shopify|webflow|wix|squarespace|framer|html\/css|javascript developer|typescript developer|tailwind|prisma|graphql|rest api|mern|software engineer(s)?|software developer(s)?|salesforce developer|web accessibility|ontwikkelaar)\b/i.test(primaryText) ||
    (/\b(develop(er|ers|ing)?|devs?|code|coding|build|program(mer|ming)?)\b/i.test(primaryText) && /\b(website|web app|platform|portal|site|system|application)\b/i.test(primaryText))
  ) {
    return 'Web Development';
  }

  // Consulting & Strategy
  if (/\b(fractional cmo|fractional cto|business consultant|strategy consultant|advisor|accountant|accounting|bookkeeper|bookkeeping|tax filing|crm system|advisory)\b/i.test(primaryText)) {
    return 'Consulting & Strategy';
  }

  // 3. If primary text had no match, check givenNiche if valid
  if (givenNiche && VALID_NICHES.includes(givenNiche)) {
    return givenNiche;
  }

  // 4. Keyword fallback
  if (kw) {
    if (/\b(performance marketing|paid ads|facebook ads|google ads|meta ads|ppc|marketing|advertising)\b/i.test(kw)) return 'Paid Ads & Marketing';
    if (/\b(ui\/ux|design|figma)\b/i.test(kw)) return 'UI/UX Design';
    if (/\b(seo)\b/i.test(kw)) return 'SEO & Organic Growth';
    if (/\b(video)\b/i.test(kw)) return 'Video Production & Editing';
    if (/\b(branding|logo)\b/i.test(kw)) return 'Branding & Design';
    if (/\b(content|copywriting|writer)\b/i.test(kw)) return 'Content & Copywriting';
    if (/\b(mobile|ios|android|flutter|react native)\b/i.test(kw)) return 'Mobile Development';
    if (/\b(ai|automation|agent)\b/i.test(kw)) return 'AI & Automation';
    if (/\b(sales|lead gen|outreach)\b/i.test(kw)) return 'Sales & Lead Gen';
    if (/\b(web|frontend|backend|developer|dev)\b/i.test(kw)) return 'Web Development';
    if (/\b(consulting|strategy)\b/i.test(kw)) return 'Consulting & Strategy';
  }

  return 'General';
}

async function main() {
  console.log('🔄 --- SYNCING & RE-CLASSIFYING OLDER LEAD NICHES ---');

  const leads = await prisma.leadPost.findMany({
    select: {
      id: true,
      title: true,
      keyword: true,
      content: true,
      intelligence: true,
      niche: true,
      review_status: true,
    },
  });

  console.log(`Found ${leads.length} leads in database to evaluate.`);

  let updatedCount = 0;
  let alreadyAccurateCount = 0;

  for (const lead of leads) {
    const detected = detectNiche({
      niche: lead.niche,
      keyword: lead.keyword,
      content: lead.content,
      intelligence: lead.intelligence,
      title: lead.title,
    });

    if (detected !== 'General' && detected !== lead.niche) {
      console.log(`[Reclassifying] Lead "${lead.title || lead.id}": "${lead.niche || 'None'}" ➔ "${detected}"`);
      await prisma.leadPost.update({
        where: { id: lead.id },
        data: { niche: detected },
      });
      updatedCount++;
    } else {
      alreadyAccurateCount++;
    }
  }

  console.log('\n===========================================');
  console.log(`✅ SYNC COMPLETE:`);
  console.log(`   Total Leads Checked: ${leads.length}`);
  console.log(`   Updated / Reclassified: ${updatedCount}`);
  console.log(`   Already Accurate: ${alreadyAccurateCount}`);
  console.log('===========================================\n');
}

main()
  .catch((err) => {
    console.error('❌ Sync script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
