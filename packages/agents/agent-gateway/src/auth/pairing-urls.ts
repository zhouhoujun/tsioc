import * as os from 'os';
import type { GatewayConfig } from '../contracts/GatewayConfig';

const WILDCARD_HOSTS = new Set(['0.0.0.0', '::', '[::]']);

function lanAddresses(): string[] {
    const addresses: string[] = [];
    try {
        const interfaces = os.networkInterfaces();
        Object.keys(interfaces).forEach(name => {
            (interfaces[name] || []).forEach(info => {
                if (!info || info.internal || info.family !== 'IPv4') {
                    return;
                }
                if (!addresses.includes(info.address)) {
                    addresses.push(info.address);
                }
            });
        });
    } catch {
        // Network interface enumeration is best-effort (sandboxes, CI).
    }
    return addresses;
}

/**
 * Browser URLs for a pairing code. A wildcard bind address is reachable from
 * other devices through the host's LAN addresses, so loopback plus every
 * non-internal IPv4 address is listed (local-first).
 */
export function buildPairingUrls(config: GatewayConfig, code: string, port?: number): string[] {
    const configuredHost = String(config.host || '127.0.0.1').trim();
    const actualPort = Number(port || config.port || 0);
    const suffix = actualPort > 0 ? `:${actualPort}` : '';
    const link = (host: string): string => `http://${host}${suffix}/?pair=${encodeURIComponent(code)}`;
    if (!WILDCARD_HOSTS.has(configuredHost)) {
        return [link(configuredHost)];
    }
    return ['127.0.0.1', ...lanAddresses()].map(link);
}
