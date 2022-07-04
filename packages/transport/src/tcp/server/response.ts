import { ResponseHeader, ResponsePacket } from '@tsdi/core';
import { Socket } from 'net';

/**
 * TcpResponse.
 */
export class TcpServResponse implements ResponsePacket, ResponseHeader {

    type = 0;
    status = 0;
    statusMessage = '';

    body: any;

    constructor(readonly socket: Socket, readonly id?: string) {

    }
    
    getHeaders() {
        throw new Error('Method not implemented.');
    }
    hasHeader(field: string): boolean {
        throw new Error('Method not implemented.');
    }
    getHeader(field: string): string | number | string[] | undefined {
        throw new Error('Method not implemented.');
    }
    setHeader(field: string, val: string | number | string[]): void;
    setHeader(fields: Record<string, string | number | string[]>): void;
    setHeader(field: unknown, val?: unknown): void {
        throw new Error('Method not implemented.');
    }
    removeHeader(field: string): void {
        throw new Error('Method not implemented.');
    }

    get ok(): boolean {
        return this.status === 200;
    }
}

