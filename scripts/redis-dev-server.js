/**
 * Dev Redis — keeps Redis available on 127.0.0.1:6379 for npm run dev.
 * Tries: existing instance → Docker → Memurai → embedded redis-memory-server.
 */
const net = require('net');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const HOST = '127.0.0.1';
const PORT = 6379;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortOpen(host, port) {
    return new Promise((resolve) => {
        const socket = net.createConnection({ host, port });
        socket.setTimeout(1500);
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('error', () => resolve(false));
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
    });
}

async function waitForRedis(maxAttempts = 15) {
    for (let i = 0; i < maxAttempts; i++) {
        if (await isPortOpen(HOST, PORT)) return true;
        await sleep(500);
    }
    return false;
}

function tryDocker() {
    try {
        execSync('docker compose up -d redis', {
            cwd: ROOT,
            stdio: 'ignore',
            windowsHide: true,
        });
        return true;
    } catch {
        return false;
    }
}

function tryMemurai() {
    if (process.platform !== 'win32') return false;
    try {
        execSync(
            'powershell -NoProfile -Command "$s = Get-Service -Name Memurai* -ErrorAction SilentlyContinue | Select-Object -First 1; if ($s -and $s.Status -ne \'Running\') { Start-Service $s.Name }"',
            { stdio: 'ignore', windowsHide: true }
        );
        return true;
    } catch {
        return false;
    }
}

async function startEmbeddedRedis() {
    const { RedisMemoryServer } = require('redis-memory-server');
    const server = new RedisMemoryServer({
        instance: {
            ip: HOST,
            port: PORT,
        },
        autoStart: false,
    });

    await server.start();
    console.log(`[redis] Embedded Redis started at redis://${HOST}:${PORT}`);

    const shutdown = async () => {
        try {
            await server.stop();
        } catch {
            /* ignore */
        }
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    return server;
}

async function main() {
    if (await isPortOpen(HOST, PORT)) {
        console.log(`[redis] Already running at redis://${HOST}:${PORT}`);
        await new Promise(() => {});
        return;
    }

    console.log('[redis] Starting Redis for development...');

    if (tryDocker() && (await waitForRedis())) {
        console.log(`[redis] Docker Redis ready at redis://${HOST}:${PORT}`);
        await new Promise(() => {});
        return;
    }

    if (tryMemurai() && (await waitForRedis())) {
        console.log(`[redis] Memurai ready at redis://${HOST}:${PORT}`);
        await new Promise(() => {});
        return;
    }

    try {
        await startEmbeddedRedis();
        if (!(await waitForRedis())) {
            throw new Error('Embedded Redis did not become reachable on port 6379');
        }
        await new Promise(() => {});
    } catch (error) {
        console.error('[redis] Failed to start Redis:', error.message);
        console.error('[redis] Install Docker or Memurai, or run: npm install (redis-memory-server)');
        process.exit(1);
    }
}

main();
