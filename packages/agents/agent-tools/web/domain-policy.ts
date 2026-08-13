export function domainAllowed(url: string, allowedDomains?: string[]): boolean {
    if (!allowedDomains || !allowedDomains.length) {
        return true;
    }
    const normalized = String(url || '').trim().toLowerCase();
    if (!normalized) {
        return false;
    }
    return allowedDomains.some(entry => {
        const candidate = String(entry || '').trim().toLowerCase();
        return candidate.length > 0 && normalized.includes(candidate);
    });
}

export function resolveIndexedEnabled(indexed: boolean | undefined, allowedDomains: string[] | undefined): boolean {
    return indexed === true && Array.isArray(allowedDomains) && allowedDomains.length > 0;
}
