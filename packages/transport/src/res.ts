import { OutgoingHeader, OutgoingHeaders, OutgoingPacket } from '@tsdi/core';
import { Writable } from 'stream';
import { TransportStream } from './stream';



export class ServerResponse extends Writable implements OutgoingPacket {
    constructor(readonly stream: TransportStream, readonly headers: OutgoingHeaders) {
        super();
    }
    
    get statusCode(): number {
        throw new Error('Method not implemented.');
    }
    set statusCode(status: number) {
        throw new Error('Method not implemented.');
    }
    get statusMessage(): string {
        throw new Error('Method not implemented.');
    }
    set statusMessage(msg: string) {
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
    writeHead(statusCode: number, headers?: OutgoingHeaders): this;
    writeHead(statusCode: number, statusMessage: string, headers?: OutgoingHeaders): this;
    writeHead(statusCode: number, statusMessage?: string | OutgoingHeaders, headers?: OutgoingHeaders): this {
        return this;
    }

    override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        
    }

    

}
