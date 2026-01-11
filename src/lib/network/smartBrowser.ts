import { gotScraping } from 'got-scraping';
import { validateUrlSecurity } from '@/lib/security';

/**
 * A High-Trust downloader that mimics a real browser (Chrome/Windows)
 * to bypass standard anti-bot protections (Cloudflare, 403s, WAFs).
 */
export async function smartDownload(url: string): Promise<Buffer> {
    try {
        // STRATEGY 1: Direct "High-Mimicry" Request
        // got-scraping auto-rotates headers and mimics a modern browser's TLS 
        const response = await gotScraping({
            url,
            responseType: 'buffer',
            // Mimic specific browser behavior
            headerGeneratorOptions: {
                browsers: [{ name: 'chrome', minVersion: 110 }],
                devices: ['desktop'],
                locales: ['en-US'],
                operatingSystems: ['windows'],
            },
            // Important: Academic sites often redirect (e.g., DOI links)
            followRedirect: true,
            retry: { limit: 2 },
            // Timeout to prevent hanging lambda
            timeout: { request: 60000 },
            hooks: {
                beforeRequest: [
                    async (options) => {
                        if (!options.url) return;
                        const urlToCheck = options.url.toString();
                        await validateUrlSecurity(urlToCheck);
                    }
                ],
                beforeRedirect: [
                    async (options, _response) => {
                        if (!options.url) return;
                        const urlToCheck = options.url.toString();
                        await validateUrlSecurity(urlToCheck);
                    }
                ]
            }
        });

        // Check if we actually got a PDF or a "You are blocked" HTML page
        const contentType = response.headers['content-type'] || '';

        // Basic validation: If asked for PDF but got HTML, check if it's a block page
        // Note: Some PDFs are served with generic octet-stream, so we check exclusions
        if (contentType.includes('text/html')) {
            const bodyPreview = response.body.toString('utf-8').substring(0, 500).toLowerCase();
            if (bodyPreview.includes('verify you are human') || bodyPreview.includes('captcha') || bodyPreview.includes('blocked')) {
                throw new Error('BLOCKED_BY_WAF');
            }
        }

        return response.body;

    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        // Log detailed error for debugging
        console.warn(`[SmartDownload] Failed for ${url}: ${error.message}`);

        // Rethrow specific errors so the caller knows it was a block
        if (error.message === 'BLOCKED_BY_WAF' || error.response?.statusCode === 403 || error.response?.statusCode === 429) {
            throw new Error('BLOCKED_ACCESS');
        }
        // Handle security errors specifically
        if (error.message && (error.message.includes('Blocked private IP') || error.message.includes('Blocked domain'))) {
             throw new Error('SECURITY_BLOCK: ' + error.message);
        }

        throw error;
    }
}
