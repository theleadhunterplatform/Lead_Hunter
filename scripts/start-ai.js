const { spawn } = require('child_process');
const path = require('path');

const aiDir = path.join(__dirname, '..', 'ai');
const candidates = process.platform === 'win32' ? ['py', 'python'] : ['python3', 'python'];

function start(index = 0) {
    if (index >= candidates.length) {
        console.error('[ai] Python not found. Install Python 3, then run:');
        console.error('  cd ai');
        console.error('  pip install -r requirements.txt');
        process.exit(1);
    }

    const cmd = candidates[index];
    const child = spawn(cmd, ['main.py'], {
        cwd: aiDir,
        stdio: 'inherit',
        shell: true,
    });

    child.on('error', () => start(index + 1));
    child.on('exit', (code, signal) => {
        if (signal) process.kill(process.pid, signal);
        process.exit(code ?? 0);
    });
}

console.log('[ai] Starting local AI service on http://localhost:8000 ...');
start();
