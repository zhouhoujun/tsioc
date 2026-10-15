export function domainAllowed(url: string, allowedDomains?: string[]): boolean {
    if (!allowedDomains || !allowedDomains.length) {
        return true;
    }
    // Match on the HOSTNAME, not a raw substring: `includes()` would let any URL
    // that merely mentions an allowed domain (path/query, or a look-alike host
    // like `example.com.evil.com`) slip past the allowlist.
    let host: string;
    try {
        host = new URL(String(url || '').trim()).hostname.toLowerCase();
    } catch {
        return false;
    }
    if (!host) {
        return false;
    }
    return allowedDomains.some(entry => {
        const candidate = String(entry || '').trim().toLowerCase().replace(/^\.+/, '');
        return !!candidate && (host === candidate || host.endsWith(`.${candidate}`));
    });
}

export function resolveIndexedEnabled(indexed: boolean | undefined, allowedDomains: string[] | undefined): boolean {
    return indexed === true && Array.isArray(allowedDomains) && allowedDomains.length > 0;
}
