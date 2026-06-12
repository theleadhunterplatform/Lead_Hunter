import '../src/config/database-env';
import prisma, { getDatabaseLabel } from '../src/lib/prisma';

async function main() {
    await prisma.$connect();
    const userCount = await prisma.user.count();
    console.log(`OK: ${getDatabaseLabel()} — ${userCount} users`);
    await prisma.$disconnect();
}

main().catch((err) => {
    console.error('FAIL:', err.message);
    process.exit(1);
});
