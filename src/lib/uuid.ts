/**
 * Robust UUID generator with fallback for insecure contexts (HTTP/Local IP).
 * `crypto.randomUUID()` is only available in secure contexts.
 */
export function generateUUID(): string {
    // Use crypto.randomUUID() if available (Secure contexts)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    // Fallback for insecure contexts (HTTP or older browsers)
    // Implementation follows RFC4122 version 4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
