import { IncomingPacket, IncomingHeaders } from '@tsdi/core';
import { Readable, Writable } from 'stream';
import { hdr } from '../consts';
import { ServerStream } from '../stream';


/**
 * Server request.
 */
export class ServerRequest extends Readable implements IncomingPacket<Writable> {
    readonly url: string;
    readonly method: string;
    readonly authority: string;
    body: any;
    private _bodyIdx = 0;
    constructor(readonly stream: ServerStream, readonly headers: IncomingHeaders) {
        super();
        this.url = headers[hdr.PATH] ?? '';
        this.method = headers[hdr.METHOD] ?? '';
        this.authority = headers[hdr.AUTHORITY] ?? '';
    }

    override _read(size: number): void {
        const end = this._bodyIdx + size
        const start = this._bodyIdx
        const payload = this.stream.read(size);
        let buf: any = null

        if (payload != null && start < payload.length) {
            buf = payload.slice(start, end)
        }

        this._bodyIdx = end;
        this.push(buf)
    }
}
