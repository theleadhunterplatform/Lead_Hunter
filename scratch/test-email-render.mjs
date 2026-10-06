import { PrismaClient } from '../frontend/apps/web/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient();

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatEmailLine(line) {
  const mdLinks = [];
  const placeholderLine = line.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g,
    (_match, label, url) => {
      const idx = mdLinks.length;
      mdLinks.push({ label, url });
      return `__MD_LINK_${idx}__`;
    },
  );

  let processed = escapeHtml(placeholderLine);

  processed = processed.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#FFB800;text-decoration:underline" target="_blank">$1</a>',
  );

  mdLinks.forEach(({ label, url }, idx) => {
    const token = `__MD_LINK_${idx}__`;
    const anchor = `<a href="${url}" style="color:#FFB800;font-weight:600;text-decoration:underline" target="_blank">${escapeHtml(label)}</a>`;
    processed = processed.replaceAll(token, anchor);
  });

  return processed;
}

function textToHtmlBody(text, cta) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const renderedParagraphs = paragraphs
    .map((p) => {
      const lines = p.split('\n').map((l) => l.trim());
      const isBulletList = lines.every((l) => l.startsWith('•') || l.startsWith('-') || l.startsWith('*'));

      if (isBulletList && lines.length > 0) {
        const items = lines
          .map((l) => {
            const itemText = l.replace(/^[•\-\*]\s*/, '');
            return `<li style="margin:4px 0">${formatEmailLine(itemText)}</li>`;
          })
          .join('');
        return `<ul style="margin:16px 0;padding-left:20px;font-size:15px;color:#ccc;line-height:1.6">${items}</ul>`;
      }

      const escaped = lines
        .map((l) => formatEmailLine(l))
        .join('<br/>');

      return `<p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">${escaped}</p>`;
    })
    .join('');

  return renderedParagraphs;
}

async function main() {
  const tpl = await prisma.broadcastTemplate.findUnique({
    where: { id: 'tpl-auto-account-approved' },
  });

  console.log('--- RAW TPL BODY FROM DB ---');
  console.log(tpl.body);

  console.log('\n--- RENDERED HTML BODY ---');
  const html = textToHtmlBody(tpl.body);
  console.log(html);
}

main().finally(() => prisma.$disconnect());
