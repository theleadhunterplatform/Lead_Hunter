import dotenv from 'dotenv';
import path from 'path';
import Role from '../models/role.model';
import connectDB from '../config/db';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedRolesAndPermissions = async () => {
    try {
        await connectDB();

        console.log('Clearing existing roles...');
        await Role.deleteMany({});

        const roles = [
            {
                name: 'Internal Admin',
                slug: 'internal_user',
                description: 'Full system management and platform operations',
                is_system_role: true,
                scopeType: 'global',
                permissions: ['*']
            },
            {
                name: 'Organization Admin',
                slug: 'org_admin',
                description: 'Business owner managing a team of lead hunters',
                is_system_role: true,
                scopeType: 'organization',
                permissions: ['lead:*', 'user:*', 'scraping:*', 'keyword:*', 'org:read']
            },
            {
                name: 'Organization User',
                slug: 'org_user',
                description: 'Team member focused on finding and qualifying leads',
                is_system_role: false,
                scopeType: 'organization',
                permissions: ['lead:read', 'lead:claim', 'keyword:read']
            },
            {
                name: 'Normal User',
                slug: 'normal_user',
                description: 'Individual lead hunter',
                is_system_role: false,
                scopeType: 'global',
                permissions: ['lead:read', 'lead:claim']
            }
        ];

        console.log('Seeding roles for Internal, Organization, and Normal users...');
        await Role.insertMany(roles);

        console.log('Data seeded successfully! 🚀');
        
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedRolesAndPermissions();
