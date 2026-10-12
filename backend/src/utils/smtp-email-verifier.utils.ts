import net from 'net';
import dnsPromises from 'dns/promises';
import type { MxRecord } from 'dns';

export interface SmtpVerifyResult {
    valid: boolean;
    status: 'verified' | 'unverified' | 'invalid';
    details: string;
    mxHost?: string;
}

const COMMON_DISPOSABLE_DOMAINS = new Set([
    'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'yopmail.com', '10minutemail.com',
    'dispostable.com', 'sharklasers.com', 'throwawaymail.com', 'trashmail.com'
]);

/**
 * Resolves MX records for a domain sorted by priority (lowest priority number = preferred).
 */
export async function getSortedMxRecords(domain: string): Promise<MxRecord[]> {
    try {
        const records = await dnsPromises.resolveMx(domain);
        return records.sort((a, b) => a.priority - b.priority);
    } catch {
        return [];
    }
}

/**
 * Performs a zero-cost direct SMTP handshake on Port 25 without sending an email.
 */
export async function verifyEmailViaSmtp(
    email: string,
    timeoutMs: number = 6000
): Promise<SmtpVerifyResult> {
    const trimmed = email.trim().toLowerCase();
    const parts = trimmed.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        return { valid: false, status: 'invalid', details: 'Malformed email address' };
    }

    const domain = parts[1];
    if (COMMON_DISPOSABLE_DOMAINS.has(domain)) {
        return { valid: false, status: 'invalid', details: 'Disposable email provider' };
    }

    const mxRecords = await getSortedMxRecords(domain);
    if (!mxRecords || mxRecords.length === 0) {
        return { valid: false, status: 'invalid', details: 'Domain has no MX mail records' };
    }

    const targetMx = mxRecords[0].exchange;

    return new Promise<SmtpVerifyResult>((resolve) => {
        let socket: net.Socket | null = null;
        let step = 0; // 0 = wait banner, 1 = sent HELO, 2 = sent MAIL FROM, 3 = sent RCPT TO
        let resolved = false;

        const finish = (result: SmtpVerifyResult) => {
            if (resolved) return;
            resolved = true;
            if (socket) {
                try {
                    socket.write('QUIT\r\n');
                    socket.destroy();
                } catch {
                    // Ignore
                }
            }
            resolve(result);
        };

        const timer = setTimeout(() => {
            finish({
                valid: true,
                status: 'unverified',
                details: 'MX record verified (SMTP port 25 timed out or blocked by firewall)',
                mxHost: targetMx,
            });
        }, timeoutMs);

        try {
            socket = net.createConnection(25, targetMx);
            socket.setTimeout(timeoutMs);
            socket.setEncoding('utf8');

            socket.on('error', (err: any) => {
                clearTimeout(timer);
                finish({
                    valid: true,
                    status: 'unverified',
                    details: `MX record valid (${err.code || 'SMTP connection blocked by firewall'})`,
                    mxHost: targetMx,
                });
            });

            socket.on('timeout', () => {
                clearTimeout(timer);
                finish({
                    valid: true,
                    status: 'unverified',
                    details: 'MX record verified (SMTP port 25 timed out)',
                    mxHost: targetMx,
                });
            });

            socket.on('data', (data: string) => {
                const line = data.trim();
                const code = parseInt(line.substring(0, 3), 10);

                if (isNaN(code)) return;

                if (step === 0) {
                    if (code === 220) {
                        step = 1;
                        socket?.write('HELO theleadhunterclub.com\r\n');
                    } else {
                        clearTimeout(timer);
                        finish({ valid: true, status: 'unverified', details: `Unexpected banner: ${code}`, mxHost: targetMx });
                    }
                } else if (step === 1) {
                    if (code === 250) {
                        step = 2;
                        socket?.write('MAIL FROM:<verify@theleadhunterclub.com>\r\n');
                    } else {
                        clearTimeout(timer);
                        finish({ valid: true, status: 'unverified', details: `HELO rejected: ${code}`, mxHost: targetMx });
                    }
                } else if (step === 2) {
                    if (code === 250) {
                        step = 3;
                        socket?.write(`RCPT TO:<${trimmed}>\r\n`);
                    } else {
                        clearTimeout(timer);
                        finish({ valid: true, status: 'unverified', details: `MAIL FROM rejected: ${code}`, mxHost: targetMx });
                    }
                } else if (step === 3) {
                    clearTimeout(timer);
                    if (code === 250 || code === 251) {
                        finish({
                            valid: true,
                            status: 'verified',
                            details: `Direct SMTP verified: mailbox exists (${code})`,
                            mxHost: targetMx,
                        });
                    } else if (code >= 550 && code <= 554) {
                        finish({
                            valid: false,
                            status: 'invalid',
                            details: `Direct SMTP rejected: mailbox does not exist (${code})`,
                            mxHost: targetMx,
                        });
                    } else {
                        finish({
                            valid: true,
                            status: 'unverified',
                            details: `SMTP server responded: ${line}`,
                            mxHost: targetMx,
                        });
                    }
                }
            });
        } catch {
            clearTimeout(timer);
            finish({
                valid: true,
                status: 'unverified',
                details: 'MX record verified (SMTP handshake skipped)',
                mxHost: targetMx,
            });
        }
    });
}
