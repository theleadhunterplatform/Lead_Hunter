import {
    classifyLeadIntent,
    confidenceToLabel,
} from '../src/utils/lead-intent-scoring.utils';

describe('lead-intent-scoring', () => {
    const relevantExamples = [
        'Looking for a Shopify developer to rebuild our store',
        'Can anyone recommend a website designer for our startup?',
        'Need help redesigning our website — open to agencies',
        'Seeking an SEO agency for a 3-month project',
        'Looking for a videography partner for product shoots',
        'Need a UI/UX designer for a startup project',
        'Looking for an app development company to build our MVP',
        "We're Hiring – Freelance Flutter Developer. Remote freelance project.",
        'I am looking for an experienced freelance developer to build a fintech application.',
        "We're Looking for the Right Tech Partner! Looking for technology partners for our food delivery platform.",
        'Looking for a technical co-founder or developer to build our AI-powered app.',
        'Looking for Web Development agency and CRM Development partner. Estimated Project Value: 8 Lakh',
        'Looking for a Social Media Growth Partner. Seeking an agency to manage our social media.',
        'Looking for a Strong Technical Partner (Remote). Open to Development Agencies.',
        'Looking for Website & Mobile App Development Companies for enterprise project.',
        'Freelance Full-Stack Web Developer Needed. Project-based freelance developer.',
    ];

    const userFreelanceProjectExamples = [
        'Hiring: Website Developer I am looking for a skilled Website Developer to create a professional website for my business. Requirements: ✅ Modern and responsive website design ✅ Mobile-friendly interface ✅ SEO-friendly structure ✅ Contact form and business information pages ✅ Experience with business/e-commerce websites is a plus If you are a website developer or know someone who might be interested, please send me a message with your portfolio and previous work. 📩 Feel free to connect and reach out. #Hiring #WebsiteDeveloper #WebDevelopment #WordPress #WebDesigner #FreelanceDeveloper #BusinessWebsite #HiringNow #TechJobs #DeveloperJobs',
        'Freelance Social Media Manager (Social-First Agency) London/Hybrid OR Remote within a commutable distance £250 per day outside IR35 2 month contract with a start date next week 3+ years of experience in organic social (agency & fashion/retail background heavily preferred). Strong strategic and platform expertise across TikTok, Instagram, and LinkedIn. Data-driven mindset with experience in reporting (Google Data Studio/Sheets, HeyOrca, Funnel). Excellent client-facing and stakeholder management skills. Please email your details to charlie@profilescreative.com or drop me a message!',
        'Need a quick estimate from website developers. 👋 I have a client who wants a website similar to: https://lnkd.in/dfWXDEkp The website includes: ✅ Multiple financial calculators ✅ Service pages ✅ Lead generation forms ✅ Mobile responsive design ✅ User registration/login features ✅ Financial advisory website structure What would be the approximate development cost and timeline for a similar website? Please comment below or DM me with your estimate and portfolio. #WebsiteDevelopment #WordPressDeveloper #WebDeveloper #FreelanceDeveloper #WebDesign #WordPress #Hiring #LinkedInCommunity',
        'I am looking for a young Website Development Intern / Freelancer who can help me build a dynamic, clean, professional, and user-friendly website. The website will include dynamic pages and regular content updates, but will not involve any payment gateway or e-commerce functionality. The work would include: • Designing and developing the website structure • Creating dynamic pages and sections • Updating content, images, services, and resources • Making the website mobile-friendly and easy to navigate • Helping with basic SEO and website maintenance • Suggesting creative ideas to improve the overall look, feel, and user experience This would be a good opportunity for a student, fresher, intern, or freelancer who has basic experience in website development and wants hands-on exposure on a live project. Interested candidates may please DM me or share their profile, portfolio, or sample work @ aarambh.arms@gmail.com #WebsiteDeveloper #WebDevelopment #WebsiteIntern #Freelancer #DynamicWebsite #WebDesign #InternshipOpportunity #DigitalPresence #WebDeveloper #FreelanceWork',
        'Hello, We are looking to develop a professional e-commerce website for our brand. The website should have a modern design, excellent user experience, secure payment gateway integration, product catalog management, order tracking, inventory management, mobile responsiveness, SEO optimization, and fast loading speed. We would like to discuss your experience, portfolio, estimated timeline, and pricing for this project. Please share relevant examples of your previous e-commerce work. #webdesigner #freelancer #websitedesigning #graphicdesigner #webdeveloper #graphicwork #openwork #job',
        'Looking for a Website Designer I’m looking for a skilled website designer who can design and develop a professional, modern, and user-friendly website for my project. If you have experience in creating visually appealing and responsive websites, please feel free to reach out. It would be great if you could share your portfolio or some of your previous work as well. Feel free to comment below or send me a direct message. Thank you!',
        'Digital Designer (UX/UI) -Contract-remote Redesign of fashion/retail brand website Working for leading design agency Outside IR35 - up to £450/day 6-8 week booking- starting asap Portfolios to eleanor@roome.co.uk if this could be you. #freelance #design #contract #digital *photo of sun setting above the ocea',
        'Urgent Freelance Video Editor Requirement 🚨 Looking for a creative Video Editor with hands-on experience in: • Content Strategy • Social Media Calendar planning • Social Media Analytics Raw content will be provided by the clients. Interested? Comment or DM. #Job #VideoEditor #DigitalMarketing #Freelance #Project #Linkedin #DigiSachinPosts #Marketing #Friday',
    ];

    const irrelevantExamples = [
        'We are hiring a full-time Shopify Engineer. Join our growing team!',
        'Open position: Senior Developer. Apply now. Benefits package included.',
        'Thrilled to announce our product launch today!',
        'Excited to share that I just joined Google as a PM',
        '5 career advice tips for junior developers',
        'Looking for web developer agency? Hire our verified freelancers ready to deliver!',
        'Available for freelance AI agent projects — DM me for details',
        'Hello I LOVE U ❤️',
    ];

    it.each(relevantExamples)('classifies buying intent as RELEVANT: %s', (text) => {
        const result = classifyLeadIntent(text);
        expect(confidenceToLabel(result.confidence)).toBe('RELEVANT');
        expect(result.confidence).toBeGreaterThanOrEqual(71);
    });

    it.each(userFreelanceProjectExamples)('classifies freelance/project buyer posts as RELEVANT: %s', (text) => {
        const result = classifyLeadIntent(text);
        expect(confidenceToLabel(result.confidence)).toBe('RELEVANT');
        expect(result.confidence).toBeGreaterThanOrEqual(71);
    });

    it.each(irrelevantExamples)('classifies employment/content as IRRELEVANT: %s', (text) => {
        const result = classifyLeadIntent(text);
        expect(confidenceToLabel(result.confidence)).toBe('IRRELEVANT');
        expect(result.confidence).toBeLessThanOrEqual(40);
    });

    it('flags full-time hiring without buying signals', () => {
        const result = classifyLeadIntent('We are hiring a full-time developer. Salary range $120k.');
        expect(result.analysis.employment.length + result.analysis.fullTime.length).toBeGreaterThan(0);
        expect(result.confidence).toBeLessThanOrEqual(40);
    });

    it('returns reasons array', () => {
        const result = classifyLeadIntent('Can anyone recommend a good SEO agency?');
        expect(result.reasons.length).toBeGreaterThan(0);
        expect(result.analysis.recommendation.length).toBeGreaterThan(0);
    });
});
