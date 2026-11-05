import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getBraveExecutable(): string | undefined {
    const candidates = [
        'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware/Brave-Browser/Application/brave.exe'),
    ];
    return candidates.find((p) => fs.existsSync(p));
}

async function main() {
    const sessionDir = path.resolve(__dirname, '../.linkedin-session');
    const cookiesFile = path.join(sessionDir, 'cookies.json');
    const bravePath = getBraveExecutable();

    console.log('🚀 [LocalLogin] Launching Brave Browser for persistent LinkedIn authentication...');
    if (bravePath) {
        console.log(`🦁 Browser: Brave Browser (${bravePath})`);
    } else {
        console.log('🌐 Browser: Chromium fallback (Brave not detected)');
    }
    console.log(`📁 Session directory: ${sessionDir}`);

    const proxyUrl = process.env.HUNTER_CRAWLER_PROXY_URL;
    let proxyOption: any = undefined;
    if (proxyUrl) {
        try {
            const parsed = new URL(proxyUrl);
            proxyOption = {
                server: `${parsed.protocol}//${parsed.host}`,
                username: decodeURIComponent(parsed.username),
                password: decodeURIComponent(parsed.password),
            };
            console.log(`🔒 Proxy: Routing login through Webshare (${parsed.host})`);
        } catch {
            console.warn(`⚠️ Invalid proxy URL: ${proxyUrl}. Running direct.`);
        }
    }

    const context = await chromium.launchPersistentContext(sessionDir, {
        executablePath: bravePath,
        headless: false,
        proxy: proxyOption,
        viewport: { width: 1280, height: 850 },
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ],
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    if (proxyOption?.username && proxyOption?.password) {
        await context.setHTTPCredentials({
            username: proxyOption.username,
            password: proxyOption.password,
        });
    }

    console.log('🌐 Opening LinkedIn login page...');
    try {
        await page.goto('https://www.linkedin.com/login', { waitUntil: 'commit', timeout: 45000 });
    } catch {
        console.log('⏳ Retrying navigation to LinkedIn...');
        await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null);
    }

    console.log('\n============================================================');
    console.log('👉 PLEASE LOG IN TO LINKEDIN IN BRAVE NOW.');
    console.log('👉 Complete 2FA / OTP if prompted.');
    console.log('👉 The script is waiting for you to see your actual feed.');
    console.log('👉 Once logged in, this window will save cookies and close!');
    console.log('============================================================\n');

    let loggedIn = false;
    const startTime = Date.now();

    while (Date.now() - startTime < 300000) { // 5 minutes max
        const rawUrl = page.url();
        let pathname = '';
        try {
            pathname = new URL(rawUrl).pathname;
        } catch {
            pathname = rawUrl;
        }

        const isLoginPage = pathname.includes('/login') || pathname.includes('/uas') || pathname.includes('/checkpoint') || pathname.includes('/authwall');
        const isFeed = (pathname.startsWith('/feed') || pathname.startsWith('/messaging')) && !isLoginPage;

        const cookies = await context.cookies();
        const hasLiAt = cookies.some((c) => c.name === 'li_at' && c.value && c.value.length > 50);

        // Strictly verify user is ON the feed with li_at cookie
        if (hasLiAt && isFeed) {
            console.log('🎉 [LocalLogin] Genuine login detected! URL:', rawUrl);
            console.log(`💾 Saving ${cookies.length} persistent cookies to: ${cookiesFile}`);
            fs.writeFileSync(cookiesFile, JSON.stringify(cookies, null, 2), 'utf8');

            const liAtCookie = cookies.find((c) => c.name === 'li_at')?.value;
            const jsessionCookie = cookies.find((c) => c.name === 'JSESSIONID')?.value;
            if (liAtCookie && jsessionCookie) {
                try {
                    await prisma.setting.upsert({
                        where: { key: 'linkedin_session_cookie' },
                        create: { key: 'linkedin_session_cookie', value: liAtCookie },
                        update: { value: liAtCookie },
                    });
                    await prisma.setting.upsert({
                        where: { key: 'linkedin_jsessionid' },
                        create: { key: 'linkedin_jsessionid', value: jsessionCookie },
                        update: { value: jsessionCookie },
                    });
                    console.log('☁️ [LocalLogin] Successfully synced live session cookies to Database Settings for Voyager API!');
                } catch (dbErr: any) {
                    console.warn('⚠️ [LocalLogin] Could not sync to DB:', dbErr.message);
                }
            }

            await page.waitForTimeout(3000);
            loggedIn = true;
            break;
        }

        await new Promise((r) => setTimeout(r, 2000));
    }

    await context.close();

    if (loggedIn) {
        console.log('✅ [LocalLogin] Session saved successfully! You are ready to run `npm run scrape:local`.');
    } else {
        console.error('❌ [LocalLogin] Timed out waiting for login. Please try again.');
    }
}

main().catch(console.error);
