import { HeaderAccessor, OutgoingHeader } from '@tsdi/core';
import { Writable } from 'stream';
import { TransportStream } from './stream';



export class ServerResponse extends Writable implements HeaderAccessor<OutgoingHeader> {
    constructor(readonly stream: TransportStream, readonly headers: HeaderAccessor<OutgoingHeader>) {
        super();
    }
    writeHead(statusCode: number, headers?: HeaderAccessor<OutgoingHeader>): this;
    writeHead(statusCode: number, statusMessage: string, headers?: HeaderAccessor<OutgoingHeader>): this;
    writeHead(statusCode: number, statusMessage?: string | HeaderAccessor<OutgoingHeader>, headers?: HeaderAccessor<OutgoingHeader>): this {
        return this;
    }

    override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        
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

}
