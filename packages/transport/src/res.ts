import { OutgoingHeader, ResponseHeaders } from '@tsdi/core';
import { Writable } from 'stream';
import { TransportStream } from './stream';



export class ServerResponse extends Writable implements ResponseHeaders {
    constructor(readonly stream: TransportStream, readonly headers: ResponseHeaders) {
        super();
    }
    writeHead(statusCode: number, headers?: ResponseHeaders): this;
    writeHead(statusCode: number, statusMessage: string, headers?: ResponseHeaders): this;
    writeHead(statusCode: number, statusMessage?: string | ResponseHeaders, headers?: ResponseHeaders): this {
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
