import { Header, Pattern, TransportHeaders } from '@tsdi/common';
import { Outgoing } from '../../Outgoing';
import { Packet } from '../../packet';
import { TransportOpts } from '../../TransportSession';

export class JsonOutgoing<T = any> implements Outgoing<T> {

    id: any;
    type: number | string | null;
    readonly pattern: Pattern;
    private _headers: TransportHeaders;
    body: T | null;
    error: any;
    statusCode!: any;
    statusMessage!: string;
    private _sent = false;

    
    constructor(packet: Packet, options?: TransportOpts) {
        this._headers = new TransportHeaders(undefined, options?.headerFields);
        this.id = packet.id ?? ((packet.headers instanceof TransportHeaders) ? packet.headers?.getHeader('identity') : packet.headers?.['identity'])
        this.type = packet.type ?? null;
        this.pattern = packet.pattern ?? packet.url ?? ((packet.headers instanceof TransportHeaders) ? packet.headers?.getHeader('path') : packet.headers?.['path'] as string) ?? '';
        this.body = null;
    }

    get headers() {
        return this._headers.getHeaders()
    }

    get tHeaders() {
        return this._headers
    }


    get sent(): boolean {
        return this._sent;
    }

    hasHeader(field: string): boolean {
        return this._headers.has(field);
    }
    getHeader(field: string): string | number | undefined {
        return this._headers.getHeader(field)
    }

    setHeader(field: string, val: Header): this {
        this._headers.setHeader(field, val);
        return this;
    }
    removeHeader(field: string): this {
        this._headers.delete(field);
        return this;
    }

    get writable(): boolean {
        return this.sent
    }

}