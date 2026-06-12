import prisma from '../lib/prisma';
import { hashPassword, comparePassword } from '../utils/password.utils';
import { toApiDoc, toApiDocs } from '../utils/serialize.utils';
import { wrapDoc } from '../db/wrap-doc';

const mapUser = (record: any, includePassword = false) => {
    if (!record) return null;
    const doc = wrapDoc(record, async (id, data) => {
        const updateData: any = { ...data };
        if (updateData.password) {
            updateData.password = await hashPassword(updateData.password as string);
        }
        if (updateData.organization !== undefined) {
            updateData.organizationId = updateData.organization;
            delete updateData.organization;
        }
        return prisma.user.update({ where: { id }, data: updateData });
    }, {
        async comparePassword(enteredPassword: string) {
            const user = await prisma.user.findUnique({ where: { id: record.id } });
            if (!user?.password) return false;
            return comparePassword(enteredPassword, user.password);
        },
    });

    if (record.organization) {
        doc.organization = toApiDoc(record.organization);
    }

    if (!includePassword) {
        delete doc.password;
    }

    return doc;
};

const buildWhere = (filter: any = {}) => {
    const where: any = {};

    if (filter._id || filter.id) where.id = filter._id || filter.id;
    if (filter.email) where.email = filter.email.toLowerCase().trim();
    if (filter.is_deleted !== undefined) where.is_deleted = filter.is_deleted;
    if (filter.organization) where.organizationId = filter.organization;
    if (filter.$or) {
        where.OR = filter.$or.map((clause: any) => {
            if (clause._id) return { id: clause._id };
            if (clause.email) return { email: clause.email };
            return clause;
        });
    }

    return where;
};

const User = {
    async findOne(filter: any, options?: { select?: string }) {
        const includePassword = options?.select?.includes('password');
        const user = await prisma.user.findFirst({
            where: buildWhere(filter),
            include: { organization: true },
        });
        return mapUser(user, includePassword);
    },

    async findById(id: string, options?: { select?: string }) {
        const includePassword = options?.select?.includes('password');
        const user = await prisma.user.findUnique({
            where: { id },
            include: { organization: true },
        });
        return mapUser(user, includePassword);
    },

    async find(filter: any = {}, options?: { select?: string; sort?: any; limit?: number }) {
        const orderBy = options?.sort
            ? { [Object.keys(options.sort)[0]]: options.sort[Object.keys(options.sort)[0]] === -1 ? 'desc' as const : 'asc' as const }
            : undefined;

        if (options?.select) {
            const users = await prisma.user.findMany({
                where: buildWhere(filter),
                orderBy,
                take: options?.limit,
                select: Object.fromEntries(
                    options.select.split(' ').filter(Boolean).map((field) => [field.replace('+', ''), true])
                ),
            });
            return toApiDocs(users as any[]);
        }

        const users = await prisma.user.findMany({
            where: buildWhere(filter),
            include: { organization: true },
            orderBy,
            take: options?.limit,
        });

        return users.map((user) => mapUser(user)).filter(Boolean);
    },

    async findOneAndUpdate(filter: any, data: any, _options?: any) {
        const id = filter._id || filter.id;
        const user = await prisma.user.update({
            where: { id },
            data,
            include: { organization: true },
        });
        return mapUser(user);
    },

    async create(data: any) {
        const user = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email.toLowerCase().trim(),
                password: await hashPassword(data.password),
                organizationId: data.organization || null,
                status: data.status || 'active',
                lead_access_enabled: data.lead_access_enabled ?? true,
                plan: data.plan || 'free',
                tokens: data.tokens ?? 10,
            },
            include: { organization: true },
        });
        return mapUser(user, true);
    },
};

export default User;
