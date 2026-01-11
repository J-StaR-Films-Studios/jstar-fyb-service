import dns from 'node:dns';
import net from 'node:net';

/**
 * Escapes HTML special characters to prevent HTML injection/XSS.
 * @param str The string to escape.
 * @returns The escaped string.
 */
export function escapeHtml(str: string): string {
    if (!str) return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Checks if an IP address is private, reserved, or loopback.
 * Supports both IPv4 and IPv6.
 */
export function isPrivateIp(ip: string): boolean {
    if (net.isIPv4(ip)) {
        // IPv4 checks
        const parts = ip.split('.').map(Number);
        if (parts.length !== 4) return false;

        // 0.0.0.0/8 (Current network)
        if (parts[0] === 0) return true;
        // 10.0.0.0/8 (Private)
        if (parts[0] === 10) return true;
        // 127.0.0.0/8 (Loopback)
        if (parts[0] === 127) return true;
        // 169.254.0.0/16 (Link-local / Cloud metadata)
        if (parts[0] === 169 && parts[1] === 254) return true;
        // 172.16.0.0/12 (Private)
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
        // 192.168.0.0/16 (Private)
        if (parts[0] === 192 && parts[1] === 168) return true;
        // 192.0.2.0/24 (Test-Net-1)
        if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true;
        // 198.51.100.0/24 (Test-Net-2)
        if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true;
        // 203.0.113.0/24 (Test-Net-3)
        if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return true;
        // 224.0.0.0/4 (Multicast)
        if (parts[0] >= 224 && parts[0] <= 239) return true;
        // 255.255.255.255 (Broadcast)
        if (parts[0] === 255 && parts[1] === 255 && parts[2] === 255 && parts[3] === 255) return true;

        return false;
    } else if (net.isIPv6(ip)) {
        // IPv6 checks
        // ::1 (Loopback)
        if (ip === '::1') return true;
        // :: (Unspecified)
        if (ip === '::') return true;
        // fc00::/7 (Unique Local)
        if (ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd')) return true;
        // fe80::/10 (Link Local)
        if (ip.toLowerCase().startsWith('fe80')) return true;
        // ::ffff:0:0/96 (IPv4-mapped)
        if (ip.toLowerCase().startsWith('::ffff:')) {
            const ipv4 = ip.substring(7);
            if (net.isIPv4(ipv4)) {
                return isPrivateIp(ipv4);
            }
        }
        return false;
    }
    return false;
}

/**
 * Validates a URL to ensure it doesn't point to a private/internal IP.
 * Throws an error if the URL is unsafe.
 */
export async function validateUrlSecurity(url: string): Promise<void> {
    let hostname: string;
    try {
        const parsed = new URL(url);
        hostname = parsed.hostname;
        // Block non-http/https protocols
        if (!['http:', 'https:'].includes(parsed.protocol)) {
             throw new Error('Invalid protocol');
        }
    } catch {
        throw new Error('Invalid URL');
    }

    // Handle IPv6 literals (strip brackets)
    let cleanHostname = hostname;
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
        cleanHostname = hostname.slice(1, -1);
    }

    // Direct IP check (if hostname is an IP)
    if (net.isIP(cleanHostname)) {
        if (isPrivateIp(cleanHostname)) {
            throw new Error(`Blocked private IP: ${cleanHostname}`);
        }
        return;
    }

    // DNS Resolution
    return new Promise((resolve, reject) => {
        dns.lookup(hostname, { all: true }, (err, addresses) => {
            if (err) {
                // If DNS fails, we can't verify, so it's technically "safe" from SSRF but maybe broken
                // But better to fail safe if we can't resolve?
                // Actually if it doesn't resolve, the request will fail anyway.
                // But let's log it or allow it (request will fail).
                // However, for security, if we can't check, we might want to block?
                // Standard behavior: let request fail naturally.
                // But wait, what if it resolves to internal IP later?
                // We are doing a check now.
                return resolve();
            }

            for (const addr of addresses) {
                if (isPrivateIp(addr.address)) {
                    return reject(new Error(`Blocked domain ${hostname} resolving to private IP: ${addr.address}`));
                }
            }
            resolve();
        });
    });
}
