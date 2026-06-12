import connectDB from '../config/db';
import Post from '../models/lead-post.model';
import Keyword from '../models/keyword.model';

const seedTwitterSample = async () => {
    try {
        await connectDB();
        console.log('✔ Connected to MongoDB');

        // Ensure we have a keyword to associate with
        let keyword = await Keyword.findOne({ text: 'freelance website developer' });
        if (!keyword) {
            keyword = await Keyword.create({
                text: 'freelance website developer',
                platforms: ['twitter', 'linkedin']
            } as any);
            console.log('✔ Created sample keyword');
        }

        const sampleData: any = {
            post_id: "2049048244638875735",
            url: "https://twitter.com/rsngprad/status/2049048244638875735",
            content: "Hiring: Freelance Web Developer (Remote | Hourly/Task-Based)\n\nBayol Creations is looking for a skilled and creative Web Developer to support us in improving and optimizing our existing website.\n\nOur website is already live, and we are now focused on enhancing performance, design quality, user experience, responsiveness, speed, and overall functionality.\n\n🔹 Work Type:\n• Remote Freelance Opportunity\n• Hourly / Task-Based Projects\n• Flexible Work Structure\n\n🔹 Compensation:\n• Competitive Hourly Rates",
            platform: "twitter",
            author: {
                id: "rsngprad",
                name: "rsngprad",
                handle: "rsngprad",
                url: "https://twitter.com/rsngprad"
            },
            posted_at: {
                date: new Date("Tue Apr 28 08:49:05 +0000 2026"),
                posted_ago_text: "Sample Data"
            },
            engagement: {
                likes: 18,
                comments: 0,
                shares: 22,
                views: 0
            },
            keyword: "freelance website developer",
            keyword_id: keyword._id,
            status: "pending",
            source: "scraped",
            ai_score: 85 // Mock score
        };

        // Check if exists
        const existing = await Post.findOne({ post_id: sampleData.post_id, platform: 'twitter' });
        if (existing) {
            console.log('ℹ Sample data already exists. Updating...');
            await Post.updateOne({ _id: existing._id }, sampleData);
        } else {
            await Post.create(sampleData);
            console.log('✔ Sample Twitter lead inserted successfully');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding sample data:', error);
        process.exit(1);
    }
};

seedTwitterSample();

