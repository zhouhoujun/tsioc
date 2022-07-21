import { HeaderAccessor, IncommingHeader } from '@tsdi/core';
import { Readable } from 'stream';
import { TransportStream } from './stream';

export class ServerRequest extends Readable implements HeaderAccessor<IncommingHeader> {
    constructor(readonly stream: TransportStream, readonly headers: HeaderAccessor<IncommingHeader>) {
        super();
    }

    getHeaders(): Record<string, IncommingHeader> {
        throw new Error('Method not implemented.');
    }
    hasHeader(field: string): boolean {
        throw new Error('Method not implemented.');
    }
    getHeader(field: string): IncommingHeader {
        throw new Error('Method not implemented.');
    }
    setHeader(field: string, val: IncommingHeader): void {
        throw new Error('Method not implemented.');
    }
    removeHeader(field: string): void {
        throw new Error('Method not implemented.');
    }

    override _read(size: number): void {
        
    }
}
