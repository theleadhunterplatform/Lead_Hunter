import connectDB from '../config/db';
import LeadPost from '../models/lead-post.model';
import Keyword from '../models/keyword.model';

const seedRedditSample = async () => {
    try {
        await connectDB();
        console.log('✔ Connected to MongoDB');

        // Ensure we have a keyword to associate with
        let keyword = await Keyword.findOne({ text: 'looking for freelance web developer' });
        if (!keyword) {
            keyword = await Keyword.create({
                text: 'looking for freelance web developer',
                platforms: ['reddit', 'linkedin', 'twitter']
            } as any);
            console.log('✔ Created sample keyword');
        }

        const sampleRedditData = [
            {
                post_id: "1t4aahs",
                url: "https://www.reddit.com/r/DopamineRush/comments/1t4aahs/dopamine_rush_pc_eu_pve_beta_tester_wanted/",
                content: "Dopamine Rush | PC | EU | PVE | Beta tester wanted. Looking for someone who can help us test our new web components and provide feedback on performance.",
                platform: "reddit",
                author: {
                    id: "Every-Ad2152",
                    name: "Every-Ad2152",
                    url: "https://www.reddit.com/user/Every-Ad2152"
                },
                posted_at: {
                    timestamp: 1714829345000,
                    date: new Date(1714829345000),
                    posted_ago_text: "1 hour ago"
                },
                engagement: {
                    likes: 12,
                    comments: 5
                },
                keyword: "looking for freelance web developer",
                keyword_id: keyword._id,
                status: "pending",
                source: "scraped",
                ai_score: 75,
                metadata: {
                    subreddit: "DopamineRush",
                    subredditId: "t5_xyz123"
                }
            },
            {
                post_id: "2t5bbij",
                url: "https://www.reddit.com/r/webdev/comments/2t5bbij/hiring_freelance_react_developer/",
                content: "Hiring: Freelance React Developer for a 3-month project. Must have experience with Next.js and Tailwind CSS. Remote position.",
                platform: "reddit",
                author: {
                    id: "CodeMaster99",
                    name: "CodeMaster99",
                    url: "https://www.reddit.com/user/CodeMaster99"
                },
                posted_at: {
                    timestamp: Date.now() - 3600000 * 2,
                    date: new Date(Date.now() - 3600000 * 2),
                    posted_ago_text: "2 hours ago"
                },
                engagement: {
                    likes: 45,
                    comments: 18
                },
                keyword: "looking for freelance web developer",
                keyword_id: keyword._id,
                status: "relevant",
                source: "scraped",
                ai_score: 92,
                metadata: {
                    subreddit: "webdev",
                    subredditId: "t5_2qi58"
                }
            }
        ];

        for (const postData of sampleRedditData) {
            const existing = await LeadPost.findOne({ post_id: postData.post_id, platform: 'reddit' });
            if (existing) {
                console.log(`ℹ Reddit post ${postData.post_id} already exists. Skipping...`);
            } else {
                await LeadPost.create(postData as any);
                console.log(`✔ Sample Reddit lead inserted: ${postData.post_id}`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding Reddit data:', error);
        process.exit(1);
    }
};

seedRedditSample();
