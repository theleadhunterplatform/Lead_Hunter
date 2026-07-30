const { execSync } = require('child_process');

// Load backend/.env so `npm run build` respects DB_MODE without exporting it manually.
try {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
} catch (_) {
  /* dotenv optional at generate time */
}

const mode = (process.env.DB_MODE || (process.env.NODE_ENV === 'production' ? 'supabase' : 'local')).toLowerCase();
const schema = mode === 'supabase' ? 'prisma/schema.prisma' : 'prisma/schema.sqlite.prisma';

console.log(`Generating Prisma client (${mode}) using ${schema}`);
execSync(`npx prisma generate --schema ${schema}`, { stdio: 'inherit' });
