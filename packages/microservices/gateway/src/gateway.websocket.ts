import * as http from 'node:http';
import * as https from 'node:https';
import { Injectable } from '@tsdi/ioc';
import { HttpRequestMessage } from '@tsdi/http-microservice';
import type { HttpUpgradeHandler } from '@tsdi/http-microservice';
import { GatewayInterceptor } from './gateway.interceptor';

/**
 * Raw WebSocket upgrade proxy.
 *
 * HTTP routes with `targetUrl`/discovery targets can carry WebSocket traffic;
 * the upgrade is forwarded while normal requests stay in the interceptor
 * pipeline.
 */
@Injectable()
export class GatewayWebSocketProxy implements HttpUpgradeHandler {
    constructor(private readonly gateway: GatewayInterceptor) { }

    async handle(request: http.IncomingMessage, socket: any, head: Buffer): Promise<boolean> {
        const upgradeRequest = request as unknown as HttpRequestMessage;
        const target = await this.gateway.resolveUpgradeTarget(upgradeRequest);
        if (!target) {
            return false;
        }
        const url = new URL(target.url);
        const secure = url.protocol === 'https:' || url.protocol === 'wss:';
        const upstreamPath = this.upstreamPath(target.route.path, url, request.url ?? '/');
        const headers = { ...request.headers, host: url.host };
        const upstream = (secure ? https : http).request({
            hostname: url.hostname,
            port: url.port || (secure ? 443 : 80),
            path: upstreamPath,
            method: request.method ?? 'GET',
            headers
        });

        await new Promise<void>((resolve) => {
            upstream.once('upgrade', (response, upstreamSocket, upstreamHead) => {
                const lines = [`HTTP/1.1 ${response.statusCode ?? 101} ${response.statusMessage ?? 'Switching Protocols'}`];
                for (const [key, value] of Object.entries(response.headers)) {
                    if (Array.isArray(value)) {
                        value.forEach(item => lines.push(`${key}: ${item}`));
                    } else if (value != null) {
                        lines.push(`${key}: ${value}`);
                    }
                }
                socket.setNoDelay?.(true);
                socket.write(`${lines.join('\r\n')}\r\n\r\n`);
                socket.resume?.();
                if (head?.length) {
                    upstreamSocket.write(head);
                }
                if (upstreamHead?.length) {
                    socket.write(upstreamHead);
                }
                upstreamSocket.pipe(socket);
                socket.pipe(upstreamSocket);
                upstreamSocket.on('error', () => socket.destroy());
                socket.on('error', () => upstreamSocket.destroy());
                resolve();
            });
            upstream.once('response', response => {
                const lines = [`HTTP/1.1 ${response.statusCode ?? 502} ${response.statusMessage ?? 'Bad Gateway'}`];
                for (const [key, value] of Object.entries(response.headers)) {
                    if (Array.isArray(value)) {
                        value.forEach(item => lines.push(`${key}: ${item}`));
                    } else if (value != null) {
                        lines.push(`${key}: ${value}`);
                    }
                }
                socket.write(`${lines.join('\r\n')}\r\n\r\n`);
                response.pipe(socket);
                response.once('end', () => resolve());
            });
            upstream.once('error', () => {
                if (!socket.destroyed) {
                    socket.write('HTTP/1.1 502 Bad Gateway\r\ncontent-length: 0\r\n\r\n');
                    socket.destroy();
                }
                resolve();
            });
            upstream.end();
        });
        return true;
    }

    private upstreamPath(routePath: string, target: URL, requestUrl: string): string {
        const [rawPath, query] = requestUrl.split('?');
        const path = rawPath || '/';
        const suffix = path.startsWith(routePath) ? path.slice(routePath.length) : path;
        const base = target.pathname && target.pathname !== '/' ? target.pathname.replace(/\/+$/, '') : '';
        const joined = suffix && suffix !== '/'
            ? `${base}/${suffix.replace(/^\/+/, '')}`
            : (base || '/');
        return `${joined}${query ? `?${query}` : ''}`;
    }
}
