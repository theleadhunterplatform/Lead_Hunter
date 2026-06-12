import prisma from '../lib/prisma';
import { toApiDoc, toApiDocs } from '../utils/serialize.utils';

const Role = {
    async findOne(filter: { slug?: string; _id?: string; id?: string }) {
        const where: any = {};
        if (filter.slug) where.slug = filter.slug;
        if (filter._id || filter.id) where.id = filter._id || filter.id;

        const role = await prisma.role.findFirst({ where });
        return toApiDoc(role);
    },

    async find() {
        const roles = await prisma.role.findMany();
        return toApiDocs(roles);
    },

    async findById(id: string) {
        const role = await prisma.role.findUnique({ where: { id } });
        return toApiDoc(role);
    },

    async create(data: any) {
        const role = await prisma.role.create({
            data: {
                name: data.name,
                slug: data.slug,
                description: data.description,
                permissions: data.permissions || [],
                scopeType: data.scopeType || 'organization',
                isSystemRole: data.isSystemRole ?? false,
            },
        });
        return toApiDoc(role);
    },

    async findOneAndUpdate(filter: { slug: string }, data: any, _options?: any) {
        const role = await prisma.role.upsert({
            where: { slug: filter.slug },
            update: {
                name: data.name,
                description: data.description,
                permissions: data.permissions,
                scopeType: data.scopeType,
                isSystemRole: data.isSystemRole,
            },
            create: {
                name: data.name,
                slug: data.slug,
                description: data.description,
                permissions: data.permissions || [],
                scopeType: data.scopeType || 'organization',
                isSystemRole: data.isSystemRole ?? false,
            },
        });
        return toApiDoc(role);
    },

    async findByIdAndUpdate(id: string, data: any, _options?: any) {
        const role = await prisma.role.update({
            where: { id },
            data: {
                name: data.name,
                slug: data.slug,
                description: data.description,
                permissions: data.permissions,
                scopeType: data.scopeType ?? data.scope_type,
                isSystemRole: data.isSystemRole ?? data.is_system_role,
            },
        });
        return toApiDoc(role);
    },

    async deleteMany(_filter?: any) {
        await prisma.role.deleteMany();
        return { deletedCount: 0 };
    },

    async insertMany(roles: any[]) {
        const created = [];
        for (const role of roles) {
            created.push(await this.create({
                name: role.name,
                slug: role.slug,
                description: role.description,
                permissions: role.permissions,
                scopeType: role.scopeType,
                isSystemRole: role.is_system_role ?? role.isSystemRole ?? false,
            }));
        }
        return created;
    },
};

export default Role;
