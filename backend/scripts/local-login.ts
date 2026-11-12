import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';
import prisma from '../src/lib/prisma';

// Singleton prisma imported from src/lib/prisma

function getBraveExecutable(): string | undefined {
    const candidates = [
        'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware/Brave-Browser/Application/brave.exe'),
    ];
    return candidates.find((p) => fs.existsSync(p));
}

function parseCliArgs() {
    const args = process.argv.slice(2);
    let accountNum = 1;
    let customProxy: string | undefined = undefined;
    let isClean = false;

    for (const arg of args) {
        if (arg.startsWith('--account=')) {
            const num = parseInt(arg.split('=')[1], 10);
            if (!isNaN(num) && num >= 1 && num <= 10) {
                accountNum = num;
            }
        } else if (arg.startsWith('--proxy=')) {
            customProxy = arg.split('=')[1].replace(/^["']|["']$/g, '').trim();
        } else if (arg === '--clean') {
            isClean = true;
        }
    }

    return { accountNum, customProxy, isClean };
}

async function main() {
    const { accountNum, customProxy, isClean } = parseCliArgs();
    const wolfId = `wolf_${accountNum}`;

    // Session directory for isolated account profiles
    const baseSessionsDir = path.resolve(__dirname, '../.linkedin-sessions');
    const sessionDir = path.join(baseSessionsDir, `account-${accountNum}`);
    const cookiesFile = path.join(sessionDir, 'cookies.json');
    const bravePath = getBraveExecutable();

    if (!fs.existsSync(baseSessionsDir)) {
        fs.mkdirSync(baseSessionsDir, { recursive: true });
    }

    if (isClean && fs.existsSync(sessionDir)) {
        console.log(`🧹 [Wolfpack Login] Wiping session directory for Account #${accountNum} (${sessionDir})...`);
        fs.rmSync(sessionDir, { recursive: true, force: true });
    }

    console.log(`\n🐺 ============================================================`);
    console.log(`🐺 WOLFPACK STEALTH LOGIN — ACCOUNT #${accountNum} (${wolfId})`);
    console.log(`🐺 ============================================================`);
    if (bravePath) {
        console.log(`🦁 Engine: Brave Browser (${bravePath})`);
    } else {
        console.log('🌐 Engine: Chromium fallback (Brave not detected)');
    }
    console.log(`📁 Isolated profile: ${sessionDir}`);

    // Resolve Proxy: Default to DIRECT connection for login unless explicitly requested via --proxy
    const useProxy = process.argv.includes('--proxy') || Boolean(customProxy);
    const rawProxyUrl = useProxy ? (customProxy || process.env.HUNTER_CRAWLER_PROXY_URL) : undefined;
    let proxyOption: any = undefined;

    if (rawProxyUrl) {
        try {
            const parsed = new URL(rawProxyUrl);
            let username = decodeURIComponent(parsed.username);
            // Only convert to sticky session if rotating token syntax is present
            if (username.includes('-rotate')) {
                username = username.replace('-rotate', `-session-wolf${accountNum}`);
            }
            proxyOption = {
                server: `${parsed.protocol}//${parsed.host}`,
                username,
                password: decodeURIComponent(parsed.password),
            };
            console.log(`🔒 Proxy: Routing via ${parsed.host} (auth: ${username ? 'enabled' : 'none'})`);
        } catch {
            console.warn(`⚠️ Invalid proxy URL: ${rawProxyUrl}. Running direct.`);
        }
    } else {
        console.log('⚡ Direct Connection (Fast, zero proxy lag for instant login). Pass --proxy="http://..." if you wish to route via proxy.');
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
            '--disable-infobars',
            '--disable-dev-shm-usage',
        ],
    });

    // Anti-bot stealth evasions: Strip navigator.webdriver and automation indicators
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
        });
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
        });
        (window as any).chrome = {
            runtime: {},
            loadTimes: function() {},
            csi: function() {},
            app: {},
        };
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters: any) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission } as any) :
                originalQuery(parameters)
        );
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    if (proxyOption?.username && proxyOption?.password) {
        await context.setHTTPCredentials({
            username: proxyOption.username,
            password: proxyOption.password,
        });
    }

    console.log(`\n🌐 Opening LinkedIn login page for Account #${accountNum}...`);
    try {
        await page.goto('https://www.linkedin.com/login', { waitUntil: 'commit', timeout: 45000 });
    } catch {
        console.log('⏳ Retrying navigation to LinkedIn...');
        await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null);
    }

    console.log('\n============================================================');
    console.log(`👉 PLEASE LOG IN AS BURNER ACCOUNT #${accountNum} IN BRAVE NOW.`);
    console.log('👉 Complete 2FA / OTP if prompted.');
    console.log('👉 The script is waiting for you to see your actual feed.');
    console.log('👉 Once logged in, this window will save cookies and close automatically!');
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
            console.log(`🎉 [Wolfpack Login] Genuine login detected for Account #${accountNum}! URL:`, rawUrl);
            console.log(`💾 Saving ${cookies.length} persistent cookies to: ${cookiesFile}`);
            fs.writeFileSync(cookiesFile, JSON.stringify(cookies, null, 2), 'utf8');

            const liAtCookie = cookies.find((c) => c.name === 'li_at')?.value || '';
            const jsessionCookie = cookies.find((c) => c.name === 'JSESSIONID')?.value || '';

            // Update Wolfpack Account Pool in Database Settings
            try {
                const existingSetting = await prisma.setting.findUnique({
                    where: { key: 'wolfpack_accounts' },
                });

                let pool: any[] = [];
                if (existingSetting && Array.isArray(existingSetting.value)) {
                    pool = existingSetting.value as any[];
                }

                // Upsert this account record
                const accountRecord = {
                    id: wolfId,
                    account_num: accountNum,
                    status: 'active',
                    proxy: rawProxyUrl || null,
                    li_at: liAtCookie,
                    jsessionid: jsessionCookie,
                    cookies_count: cookies.length,
                    cookies_json: JSON.stringify(cookies),
                    last_login_at: new Date().toISOString(),
                    requests_today: 0,
                };

                const existingIndex = pool.findIndex((a: any) => a.account_num === accountNum || a.id === wolfId);
                if (existingIndex >= 0) {
                    pool[existingIndex] = { ...pool[existingIndex], ...accountRecord };
                } else {
                    pool.push(accountRecord);
                }

                // Sort by account_num
                pool.sort((a: any, b: any) => (a.account_num || 0) - (b.account_num || 0));

                await prisma.setting.upsert({
                    where: { key: 'wolfpack_accounts' },
                    create: { key: 'wolfpack_accounts', value: pool as any },
                    update: { value: pool as any },
                });

                console.log(`☁️ [Wolfpack Login] Account #${accountNum} synced to Supabase database (wolfpack_accounts pool: ${pool.length} active).`);

                // Also maintain legacy single-cookie setting if Account 1
                if (accountNum === 1 && liAtCookie && jsessionCookie) {
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
                }
            } catch (dbErr: any) {
                console.warn('⚠️ [Wolfpack Login] Could not sync account to DB:', dbErr.message);
            }

            await page.waitForTimeout(3000);
            loggedIn = true;
            break;
        }

        await new Promise((r) => setTimeout(r, 2000));
    }

    await context.close();

    if (loggedIn) {
        console.log(`\n✅ [Wolfpack Login] Account #${accountNum} successfully initialized!`);
        console.log(`👉 To log into next account, run: npm run login:wolf -- --account=${accountNum + 1}`);
    } else {
        console.error(`\n❌ [Wolfpack Login] Timed out waiting for Account #${accountNum} login. Please try again.`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
