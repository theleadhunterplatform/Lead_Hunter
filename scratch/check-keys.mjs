import fs from 'fs';
['frontend/apps/web/.env.local', 'frontend/apps/web/.env'].forEach((f) => {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f, 'utf8');
    const keys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_SECURE', 'RESEND_API_KEY', 'BREVO_API_KEY', 'EMAIL_FROM'];
    console.log(f + ':');
    keys.forEach((k) => {
      const m = content.match(new RegExp(k + '=(.*)'));
      console.log(' ', k, '->', m ? (m[1].startsWith('"') ? m[1].slice(1, -1) : m[1]).slice(0, 15) + '...' : 'NOT SET');
    });
  }
});
