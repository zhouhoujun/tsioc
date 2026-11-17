import { HttpRequestMessage } from '@tsdi/http-microservice';

/**
 * Renderer-neutral request helpers shared by gateway modules.
 *
 * These are pure functions over `HttpRequestMessage` so auth, routing,
 * observability and forwarding can reuse them without duplicating header
 * normalization rules.
 */
export function getHeaderValue(request: HttpRequestMessage, name: string): string | undefined {
    const normalized = name.toLowerCase();
    const direct = request.getHeader?.(normalized) ?? request.getHeader?.(name);
    if (direct != null) {
        return String(direct);
    }
    const raw = request.headers?.[normalized] ?? request.headers?.[name];
    if (Array.isArray(raw)) {
        return raw.join(', ');
    }
    return raw != null ? String(raw) : undefined;
}

export function getRequestHost(request: HttpRequestMessage): string {
    return getHeaderValue(request, 'host') ?? '';
}

export function getClientIp(request: HttpRequestMessage): string {
    const forwarded = getHeaderValue(request, 'x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return request.socket?.remoteAddress ?? '';
}

/**
 * Normalizes a request URL against the configured gateway prefix.
 */
export function normalizeGatewayUrl(url: string, prefix?: string): string {
    const path = url.split('?')[0] || '/';
    if (!prefix || prefix === '/') {
        return path;
    }
    return path.startsWith(prefix) ? (path.slice(prefix.length) || '/') : path;
}

export function asStringArray(value: any): string[] {
    if (Array.isArray(value)) {
        return value.map(v => String(v));
    }
    if (typeof value === 'string') {
        return value.split(/\s+/).map(v => v.trim()).filter(Boolean);
    }
    if (value == null) {
        return [];
    }
    return [String(value)];
}

export function matchClaimValue(actual: any, expected: any): boolean {
    if (Array.isArray(actual)) {
        return actual.some(item => matchClaimValue(item, expected));
    }
    return actual === expected;
}

export function matchesIp(rule: string, ip: string): boolean {
    if (!rule) {
        return false;
    }
    if (rule.includes('/')) {
        const [base, prefixText] = rule.split('/');
        const prefix = parseInt(prefixText, 10);
        if (!Number.isFinite(prefix)) {
            return false;
        }
        return maskIpv4(ip, prefix) === maskIpv4(base, prefix);
    }
    return rule === ip;
}

function maskIpv4(ip: string, prefix: number): string {
    const parts = ip.split('.').map(v => parseInt(v, 10));
    if (parts.length !== 4 || parts.some(v => Number.isNaN(v))) {
        return ip;
    }
    const safePrefix = Math.max(0, Math.min(32, prefix));
    const mask = safePrefix === 0 ? 0 : (0xffffffff << (32 - safePrefix)) >>> 0;
    const value = (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
    const masked = value & mask;
    return [
        (masked >>> 24) & 255,
        (masked >>> 16) & 255,
        (masked >>> 8) & 255,
        masked & 255
    ].join('.');
}
