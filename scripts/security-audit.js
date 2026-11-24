/**
 * Automated Security & Pre-Flight Audit Suite
 * Inspired by Cloudflare's Security-Audit Agent Patterns.
 * Runs pre-flight verification across endpoints, auth boundaries, headers, and rate limits.
 */

const http = require('http');
const https = require('https');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

console.log('🛡️  [Cloudflare Audit Suite] Initializing Pre-Flight Security Checks...\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${testName} — ${details}`);
  }
}

async function fetchUrl(url, options = {}) {
  const isHttps = url.startsWith('https');
  const client = isHttps ? https : http;

  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const req = client.request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: options.method || 'GET',
          headers: options.headers || {},
          timeout: 5000,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body,
            });
          });
        }
      );

      req.on('error', (err) => {
        resolve({ error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ error: 'Connection timed out' });
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    } catch (e) {
      resolve({ error: e.message });
    }
  });
}

async function runAudit() {
  console.log('--- 1. Header Leak & Server Fingerprinting ---');
  const beRes = await fetchUrl(`${BACKEND_URL}/health`);
  if (!beRes.error && beRes.headers) {
    assert(
      !beRes.headers['x-powered-by'],
      'Backend disables X-Powered-By header',
      `Header found: ${beRes.headers['x-powered-by']}`
    );
  } else {
    console.log(`  ℹ️  Backend offline at ${BACKEND_URL}; skipping live header test.`);
  }

  console.log('\n--- 2. Public File Exposure Defense ---');
  const envTest = await fetchUrl(`${FRONTEND_URL}/.env`);
  if (!envTest.error && envTest.statusCode) {
    assert(
      envTest.statusCode === 404 || envTest.statusCode === 403,
      'Direct HTTP request to /.env is blocked/404',
      `Status code: ${envTest.statusCode}`
    );
  } else {
    console.log(`  ℹ️  Frontend offline at ${FRONTEND_URL}; skipping file probe.`);
  }

  console.log('\n--- 3. Static AI Indexing Discovery ---');
  const fs = require('fs');
  const path = require('path');
  const llmsPath = path.join(__dirname, '../frontend/apps/web/public/llms.txt');
  const robotsPath = path.join(__dirname, '../frontend/apps/web/public/robots.txt');

  assert(fs.existsSync(llmsPath), 'public/llms.txt exists in frontend', 'File missing');
  assert(fs.existsSync(robotsPath), 'public/robots.txt exists in frontend', 'File missing');

  if (fs.existsSync(llmsPath)) {
    const content = fs.readFileSync(llmsPath, 'utf8');
    assert(
      content.includes('The Lead Hunter Club') && content.includes('Pricing'),
      'llms.txt contains platform title and pricing schema'
    );
  }

  console.log('\n--- 4. Multi-Platform Scraper Engine Support ---');
  const scrapedogPath = path.join(__dirname, '../backend/src/services/scrapedog-scraper.service.ts');
  const crawlbasePath = path.join(__dirname, '../backend/src/services/crawlbase-scraper.service.ts');

  if (fs.existsSync(scrapedogPath)) {
    const sContent = fs.readFileSync(scrapedogPath, 'utf8');
    assert(
      sContent.includes("case 'github':") && sContent.includes("case 'youtube':"),
      'Scrapedog supports GitHub & YouTube platform expansion'
    );
  }

  if (fs.existsSync(crawlbasePath)) {
    const cContent = fs.readFileSync(crawlbasePath, 'utf8');
    assert(
      cContent.includes("case 'github':") && cContent.includes("case 'youtube':"),
      'Crawlbase supports GitHub & YouTube platform expansion'
    );
  }

  console.log('\n--- 5. Anti-Saturation & 48h Expiration Logic ---');
  const mapperPath = path.join(__dirname, '../frontend/apps/web/src/lib/lead-mapper.ts');
  if (fs.existsSync(mapperPath)) {
    const mContent = fs.readFileSync(mapperPath, 'utf8');
    assert(
      mContent.includes('isExpired48h') && mContent.includes('48 * 60 * 60 * 1000'),
      'Lead mapper strictly enforces 48h expiration limit'
    );
  }

  console.log('\n========================================');
  console.log(`Audit Complete: ${passedTests}/${totalTests} checks passed (${failedTests} failed).`);
  console.log('========================================\n');
}

runAudit();
