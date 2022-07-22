import { IncomingPacket, IncommingHeaders } from '@tsdi/core';
import { Readable, Writable } from 'stream';
import { TransportStream } from './stream';


/**
 * Server request.
 */
export class ServerRequest extends Readable implements IncomingPacket<Writable> {
    constructor(readonly stream: TransportStream, readonly headers: IncommingHeaders) {
        super();
        
    }

    override _read(size: number): void {

    }
}
