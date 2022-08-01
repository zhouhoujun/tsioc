import { IncomingPacket, IncommingHeaders } from '@tsdi/core';
import { EMPTY_OBJ } from '@tsdi/ioc';
import { Readable, Writable } from 'stream';
import { Socket } from 'net';
import { TLSSocket } from 'tls';

/**
 * Server request.
 */
export class ServerRequest extends Readable implements IncomingPacket<Writable> {
    readonly id: string;
    readonly url: string;
    readonly method: string;
    readonly params: Record<string, any>;
    readonly headers: IncommingHeaders;
    body: any;
    private _bodyIdx = 0;
    constructor(
        readonly socket: Socket | TLSSocket,
        options: {
            id?: string,
            url?: string;
            body?: any,
            headers?: IncommingHeaders;
            params?: Record<string, any>;
            method?: string;
            update?: boolean;
        } = EMPTY_OBJ) {
        super();
        this.id = options.id ?? '';
        this.url = options.url ?? '';
        this.body = options.body;
        this.method = options.method ?? '';
        this.params = options.params ?? {};
        this.headers = { ...options.headers };
    }

    override _read(size: number): void {
        const end = this._bodyIdx + size
        const start = this._bodyIdx
        const payload = this.socket.read(size);
        let buf: any = null

        if (payload != null && start < payload.length) {
            buf = payload.slice(start, end)
        }

        this._bodyIdx = end;
        this.push(buf)
    }
}
