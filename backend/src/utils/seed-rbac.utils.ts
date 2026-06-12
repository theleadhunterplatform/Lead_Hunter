import Role from '../models/role.model';
import User from '../models/user.model';
import RoleAssignment from '../models/role-assignment.model';

const SEED_ROLES = [
    {
        name: "System Overlord",
        slug: "system_owner",
        description: "Full Platform access with absolute authority",
        permissions: ["*"],
        scopeType: "global",
        isSystemRole: true
    },
    {
        name: "Internal Operative",
        slug: "internal_user",
        description: "Internal team member with platform-wide visibility",
        permissions: ["*"],
        scopeType: "global",
        isSystemRole: true
    },
    {
        name: "Agency Principal",
        slug: "org_admin",
        description: "Full management access for an organization and its team",
        permissions: [
            "lead:read",
            "lead:claim",
            "lead:hunt",
            "keyword:read",
            "keyword:create",
            "keyword:update",
            "keyword:delete",
            "user:read",
            "user:create",
            "user:update",
            "org:read",
            "scraper:run",
            "target:read",
            "target:create",
            "target:update",
            "target:delete"
        ],
        scopeType: "organization",
        isSystemRole: true
    },
    {
        name: "Lead Hunter",
        slug: "org_user",
        description: "Search and claim capabilities for organization members",
        permissions: [
            "lead:read",
            "lead:claim",
            "keyword:read"
        ],
        scopeType: "organization",
        isSystemRole: true
    },
    {
        name: "Freelance Hunter",
        slug: "normal_user",
        description: "Individual access for solo lead hunting",
        permissions: [
            "lead:read",
            "lead:claim",
            "lead:hunt",
            "keyword:read"
        ],
        scopeType: "global",
        isSystemRole: true
    }
];

const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@leadhunter.com').toLowerCase().trim();
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@12345';
const DEFAULT_ADMIN_NAME = process.env.ADMIN_NAME || 'Platform Admin';

const assignSystemOwner = async (user: any, systemOwnerRole: any) => {
    if (!user.is_active || user.status !== 'active' || user.is_deleted) {
        user.is_active = true;
        user.status = 'active';
        user.is_deleted = false;
        await user.save();
    }

    const existingAssignment = await RoleAssignment.findOne({
        userId: user._id,
        roleId: systemOwnerRole._id,
        'scope.type': 'global',
    });

    if (!existingAssignment) {
        await RoleAssignment.create({
            userId: user._id,
            roleId: systemOwnerRole._id,
            scope: { type: 'global', organizationId: null },
            assignedBy: user._id,
        });
    }
};

export const seedDefaultAdmin = async (systemOwnerRole?: any) => {
    const role = systemOwnerRole || await Role.findOne({ slug: 'system_owner' });
    if (!role) return;

    let user = await User.findOne({ email: DEFAULT_ADMIN_EMAIL });

    if (!user) {
        user = await User.create({
            name: DEFAULT_ADMIN_NAME,
            email: DEFAULT_ADMIN_EMAIL,
            password: DEFAULT_ADMIN_PASSWORD,
        });
        console.log(`✔ Default admin account created (${DEFAULT_ADMIN_EMAIL})`);
    } else {
        console.log(`ℹ Default admin already exists (${DEFAULT_ADMIN_EMAIL})`);
    }

    await assignSystemOwner(user, role);
};

export const seedRBAC = async () => {
    try {
        // 1. Seed Roles
        for (const roleData of SEED_ROLES) {
            await Role.findOneAndUpdate(
                { slug: roleData.slug },
                roleData,
                { upsert: true, returnDocument: 'after' }
            );
        }

        // 2. Identify System Owner Role
        const systemOwnerRole = await Role.findOne({ slug: 'system_owner' });
        if (!systemOwnerRole) throw new Error('System Owner role not found after seed');

        // 3. Ensure default platform admin exists
        await seedDefaultAdmin(systemOwnerRole);

        // 4. Assign System Owner Role to additional master emails
        const masterEmails = ['rajputlakshit0@gmail.com'];
        for (const rawEmail of masterEmails) {
            const email = rawEmail.toLowerCase().trim();
            const user = await User.findOne({ email });
            console.log(`Checking master email: ${email}, User found: ${user ? 'Yes' : 'No'}`);
            if (user) {
                await assignSystemOwner(user, systemOwnerRole);
                console.log(`✔ Master clearance assigned to ${email}`);
            }
        }
    } catch (error) {
        console.error('✖ RBAC Seeding Error:', error);
    }
};
