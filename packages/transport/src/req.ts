import { RequestHeaders } from '@tsdi/core';
import { Readable } from 'stream';
import { TransportStream } from './stream';

export class ServerRequest extends Readable {
    constructor(readonly stream: TransportStream, readonly headers: RequestHeaders) {
        super();
    }

    override _read(size: number): void {
        
    }
}
