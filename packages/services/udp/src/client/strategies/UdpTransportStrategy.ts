import { Injectable } from '@tsdi/ioc';
import { IClientTransportStrategy } from '@tsdi/common/client';
import { UdpRequest } from '../../client/request';
import { Pattern, RequestInitOpts } from '@tsdi/common';
import { Socket } from 'node:dgram';

/**
 * UDP transport strategy (client side).
 * Lightweight default implementation used by UDP protocol to create requests
 * and manage lifecycle for a UDP socket.
 */
@Injectable()
export class UdpTransportStrategy implements IClientTransportStrategy<Socket, UdpRequest<any>, Buffer | string> {
    // Basic lifecycle flags; in real usage this would be driven by the transport layer
    connected = false;

    async connect(): Promise<void> {
        // UDP is connectionless; nothing to "connect" per se
        this.connected = true;
    }

    createRequest(pattern: Pattern, options: RequestInitOpts<any, any>): UdpRequest<any> {
        // Follow the same simple pattern as HTTP client strategy: if pattern is a string,
        // treat it as a URL; otherwise stringify/serialize the pattern.
        if (typeof pattern === 'string') {
            return new UdpRequest(pattern, null, options);
        }
        // Fallback: stringify the pattern representation
        const url = String(pattern);
        return new UdpRequest(url, (pattern as any) ?? null, options);
    }

    initContext(_ctx: any, _req: UdpRequest<any>): void {
        // UDP request context initialization can be extended by concrete implementations
    }

    async onShutdown(): Promise<void> {
        this.connected = false;
    }

    getConfig(): any {
        return {};
    }

    isConnected(): boolean {
        return this.connected;
    }
}
