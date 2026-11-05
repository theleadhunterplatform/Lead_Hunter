import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';

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

    const context = await chromium.launchPersistentContext(sessionDir, {
        executablePath: bravePath,
        headless: false,
        viewport: { width: 1280, height: 850 },
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ],
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    console.log('🌐 Opening LinkedIn feed...');
    await page.goto('https://www.linkedin.com/feed', { waitUntil: 'domcontentloaded' });

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
