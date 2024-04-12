import { MapHeaders, Pattern, TransportHeaders } from '@tsdi/common';
import { Packet } from '../../packet';
import { Incoming } from '../../Incoming';

export class JsonIncoming<T = any> implements Incoming<T> {
    readonly id: any;
    readonly method: string;
    readonly originalUrl: string;
    readonly pattern: Pattern;
    private _headers: TransportHeaders;

    get headers(): MapHeaders {
        return this._headers.getHeaders()
    }

    get tHeaders() {
        return this._headers
    }

    url: string;
    body: T | null;
    constructor(packet: Packet) {
        this._headers = new TransportHeaders(packet.headers);
        this.id = packet.id ?? this._headers.getIdentity();
        this.method = packet.method ?? this._headers.getMethod() ?? '';
        this.url = packet.url ?? this._headers.getPath() ?? '';
        this.originalUrl = this.url.toString();
        this.pattern = packet.pattern ?? this.url;
        this.body = packet.payload ?? null;

    }



    hasHeader(field: string): boolean {
        return this._headers.has(field)
    }
    getHeader(field: string): string | undefined {
        return this._headers.getHeader(field)
    }

    rawBody?: any;
    path?: any;

}