import {  OutgoingHeader, OutgoingHeaders, OutgoingPacket } from '@tsdi/core';
import { Socket } from 'dgram';

/**
 * UdpServResponse.
 */
export class UdpServResponse implements OutgoingPacket {

    type = 0;
    status = 0;
    statusMessage = '';

    body: any;

    constructor(readonly socket: Socket, readonly id?: string) {

    }
    getHeaderNames(): string[] {
        throw new Error('Method not implemented.');
    }
    get headersSent(): boolean {
        throw new Error('Method not implemented.');
    }
    writeHead(statusCode: number, headers?: OutgoingHeaders | OutgoingHeader[] | undefined): this;
    writeHead(statusCode: number, statusMessage: string, headers?: OutgoingHeaders | OutgoingHeader[] | undefined): this;
    writeHead(statusCode: unknown, statusMessage?: unknown, headers?: unknown): this {
        throw new Error('Method not implemented.');
    }
    get statusCode(): number {
        throw new Error('Method not implemented.');
    }
    set statusCode(status: number) {
        throw new Error('Method not implemented.');
    }
    getHeaders(): Record<string, OutgoingHeader> {
        throw new Error('Method not implemented.');
    }
    hasHeader(field: string): boolean {
        throw new Error('Method not implemented.');
    }
    getHeader(field: string): OutgoingHeader {
        throw new Error('Method not implemented.');
    }
    setHeader(field: string, val: OutgoingHeader): void {
        throw new Error('Method not implemented.');
    }
    removeHeader(field: string): void {
        throw new Error('Method not implemented.');
    }

    get ok(): boolean {
        return this.status === 200;
    }
}

