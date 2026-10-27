import type { GatewayConfig } from '../contracts/GatewayConfig';

const WILDCARD_HOSTS = new Set(['0.0.0.0', '::', '[::]']);

/**
 * Browser URL for a pairing code. Wildcard bind addresses are not reachable
 * from a browser, so loopback is shown instead (remote devices replace the
 * host with the machine's LAN address).
 */
export function buildPairingUrls(config: GatewayConfig, code: string, port?: number): string[] {
    const host = String(config.host || '127.0.0.1').trim();
    const displayHost = WILDCARD_HOSTS.has(host) ? '127.0.0.1' : host;
    const actualPort = Number(port || config.port || 0);
    const suffix = actualPort > 0 ? `:${actualPort}` : '';
    return [`http://${displayHost}${suffix}/?pair=${encodeURIComponent(code)}`];
}
