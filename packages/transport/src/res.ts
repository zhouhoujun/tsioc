import { ResHeaderType, TransportHeaders } from '@tsdi/core';
import { Writable } from 'stream';
import { TransportStream } from './stream';



export class ServerResponse extends Writable {
    constructor(readonly stream: TransportStream, readonly headers: TransportHeaders<ResHeaderType>) {
        super();
    }

    // writeHead(statusCode: number, headers?: OutgoingHttpHeaders): this;
    // writeHead(statusCode: number, statusMessage: string, headers?: OutgoingHttpHeaders): this;
    // writeHead(statusCode: number, statusMessage: string, headers?: OutgoingHttpHeaders): this {

    // }
}
