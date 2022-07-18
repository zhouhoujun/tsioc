import { MapHeaders, ReqHeaderType, RequestHeader } from '@tsdi/core';
import { EMPTY_OBJ, isNull } from '@tsdi/ioc';
import { Socket } from 'net';
import { Writable } from 'stream';
import { filter } from 'rxjs';
import { hdr, identity } from '../../consts';
import { IncomingRequest } from '../../incoming';
import { PacketProtocol } from '../packet';

export class TcpServRequest extends MapHeaders implements IncomingRequest, RequestHeader {

    public readonly id: string;
    public readonly url: string;
    public readonly method: string;
    public readonly params: Record<string, any>;

    body: any;

    constructor(private protocol: PacketProtocol, readonly socket: Socket, option: {
        id?: string,
        url?: string;
        body?: any,
        headers?: Record<string, ReqHeaderType>;
        params?: Record<string, any>;
        method?: string;
        update?: boolean;
    } = EMPTY_OBJ) {
        super();
        this.id = option.id ?? '';
        this.url = option.url ?? '';
        this.body = option.body;
        this.method = option.method ?? '';
        this.params = option.params ?? {};
        if (option.headers) {
            this.setHeaders(option.headers);
        }
    }

    pipe<T extends Writable>(destination: T, options?: { end?: boolean | undefined; } | undefined): T {
        const len = this.getHeader(hdr.CONTENT_LENGTH) ?? 0;
        const hdrcode = this.getHeader(hdr.CONTENT_ENCODING) as string || identity;
        let length = 0;
        if (len && hdrcode === identity) {
            length = ~~len
        }
        if (!length) {
            return destination;
        }
        let bytes = 0;
        const bodys: any[] = [];
        const sub = this.protocol.read(this.socket)
            .pipe(
                filter(p => p.id === this.id && !isNull(p.body))
            ).subscribe(pk => {
                bodys.push(pk.body)
                bytes += pk.body.length;
                destination.write(pk.body)

                if (length <= bytes && options?.end !== false) {
                    destination.end();
                    sub && sub.unsubscribe();
                }
            });
        return destination;
    }
}

