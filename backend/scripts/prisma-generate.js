const { execSync } = require('child_process');

const mode = (process.env.DB_MODE || (process.env.NODE_ENV === 'production' ? 'supabase' : 'local')).toLowerCase();
const schema = mode === 'supabase' ? 'prisma/schema.prisma' : 'prisma/schema.sqlite.prisma';

console.log(`Generating Prisma client (${mode}) using ${schema}`);
execSync(`npx prisma generate --schema ${schema}`, { stdio: 'inherit' });
