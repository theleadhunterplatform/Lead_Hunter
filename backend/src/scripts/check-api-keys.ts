import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';
import connectDB from '../config/db';
import prisma from '../lib/prisma';
import { getSetting } from '../services/setting.service';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkApify(token: string) {
    try {
        const res = await axios.get('https://api.apify.com/v2/users/me', {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 8000
        });
        const user = res.data?.data;
        let limits: any = null;
        try {
            const limRes = await axios.get('https://api.apify.com/v2/users/me/limits', {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 8000
            });
            limits = limRes.data?.data;
        } catch {}

        return {
            valid: true,
            username: user?.username,
            email: user?.email,
            plan: user?.plan?.id || 'FREE',
            status: 'ACTIVE',
            limits
        };
    } catch (err: any) {
        const status = err.response?.status;
        const msg = err.response?.data?.error?.message || err.message;
        return { valid: false, status: status === 401 ? 'EXHAUSTED / INVALID' : `ERROR (${status})`, msg };
    }
}

async function checkScrapedog(key: string) {
    try {
        await axios.get(`https://api.scrapedog.com/scrape?api_key=${key}&url=https://httpbin.org/ip`, {
            timeout: 10000
        });
        return { valid: true, status: 'ACTIVE' };
    } catch (err: any) {
        const status = err.response?.status;
        const msg = typeof err.response?.data === 'string' ? err.response?.data : JSON.stringify(err.response?.data || '');
        const isLimit = status === 401 || status === 403 || status === 429 || /quota|limit|credit|exhaust/i.test(msg);
        return { valid: false, status: isLimit ? 'EXHAUSTED / NO CREDITS' : `ERROR (${status})`, msg };
    }
}

async function checkCrawlbase(token: string) {
    try {
        await axios.get(`https://api.crawlbase.com/?token=${token}&url=https://httpbin.org/ip`, {
            timeout: 10000
        });
        return { valid: true, status: 'ACTIVE' };
    } catch (err: any) {
        const status = err.response?.status;
        const msg = typeof err.response?.data === 'string' ? err.response?.data : JSON.stringify(err.response?.data || '');
        const isLimit = status === 401 || status === 403 || status === 429 || /quota|limit|credit|exhaust/i.test(msg);
        return { valid: false, status: isLimit ? 'EXHAUSTED / NO CREDITS' : `ERROR (${status})`, msg };
    }
}

async function main() {
    await connectDB();
    console.log('============================================================');
    console.log('🔍 LIVE TOKEN VALIDATION AUDIT (Apify, Scrapedog, Crawlbase)');
    console.log('============================================================\n');

    // 1. Apify
    const apifyKeys = await prisma.apifyKey.findMany({ where: { is_deleted: false } });
    console.log(`📌 APIFY (${apifyKeys.length} active keys in DB pool):`);
    for (const k of apifyKeys) {
        const token = k.key;
        const check = await checkApify(token);
        const prefix = token.slice(0, 12);
        if (check.valid) {
            const usage = check.limits?.currentUsageUsd != null ? `$${check.limits.currentUsageUsd} / $${check.limits.maxMonthlyUsageUsd || 5}` : 'Active';
            console.log(`  ✅ [${k.label || 'Key'}] ${prefix}... -> VALID & ACTIVE`);
            console.log(`     User: ${check.username} (${check.email}) | Plan: ${check.plan} | Usage: ${usage}`);
        } else {
            console.log(`  ❌ [${k.label || 'Key'}] ${prefix}... -> ${check.status} (${check.msg})`);
        }
    }

    const envApify = process.env.APIFY_API_TOKEN;
    if (envApify && !apifyKeys.some(k => k.key === envApify)) {
        console.log(`\n📌 APIFY (.env token):`);
        const check = await checkApify(envApify);
        if (check.valid) {
            console.log(`  ✅ ${envApify.slice(0, 12)}... -> VALID & ACTIVE (${check.email})`);
        } else {
            console.log(`  ❌ ${envApify.slice(0, 12)}... -> ${check.status} (${check.msg})`);
        }
    }

    // 2. Scrapedog
    console.log(`\n📌 SCRAPEDOG:`);
    const dbSdKey = await getSetting('scrapedog_api_key');
    const envSdKey = process.env.SCRAPEDOG_API_KEY;
    const sdKey = dbSdKey || envSdKey;
    if (sdKey) {
        const check = await checkScrapedog(sdKey.trim());
        if (check.valid) {
            console.log(`  ✅ Key: ${sdKey.slice(0, 8)}... -> VALID & ACTIVE (Credits available)`);
        } else {
            console.log(`  ❌ Key: ${sdKey.slice(0, 8)}... -> ${check.status} (${check.msg})`);
        }
    } else {
        console.log('  ⚠️ Not configured (No key in DB or .env)');
    }

    // 3. Crawlbase
    console.log(`\n📌 CRAWLBASE:`);
    const dbCbToken = await getSetting('crawlbase_token');
    const envCbToken = process.env.CRAWLBASE_TOKEN;
    const cbToken = dbCbToken || envCbToken;
    if (cbToken) {
        const check = await checkCrawlbase(cbToken.trim());
        if (check.valid) {
            console.log(`  ✅ Token: ${cbToken.slice(0, 8)}... -> VALID & ACTIVE (Credits available)`);
        } else {
            console.log(`  ❌ Token: ${cbToken.slice(0, 8)}... -> ${check.status} (${check.msg})`);
        }
    } else {
        console.log('  ⚠️ Not configured (No token in DB or .env)');
    }


    console.log('\n============================================================\n');
}

main()
    .catch((e) => console.error(e))
    .finally(() => prisma.$disconnect());
