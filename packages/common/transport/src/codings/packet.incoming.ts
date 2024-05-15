import { MapHeaders, Pattern, TransportHeaders, normalize } from '@tsdi/common';
import { Packet, ResponsePacket } from '../packet';
import { Incoming, ResponseIncoming } from '../Incoming';
import { TransportOpts } from '../TransportSession';

export class PacketIncoming<T = any> implements Incoming<T> {
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

    get payload() {
        return this.body;
    }

    url: string;
    body: T | null;
    constructor(packet: Packet, options?: TransportOpts) {
        this._headers = new TransportHeaders(packet.headers, options?.headerFields);
        this.id = packet.id ?? this._headers.getIdentity();
        this.method = packet.method ?? this._headers.getMethod() ?? options?.defaultMethod ?? '';
        this.url = normalize(packet.url ?? this._headers.getPath() ?? '');
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

export class ResponsePacketIncoming<T = any> extends PacketIncoming<T> implements ResponseIncoming<T> {
    readonly type: string | number | undefined;
    readonly status: string | number | undefined;
    readonly statusMessage: string | undefined;
    readonly ok?: boolean;
    error: any;

    get statusText() {
        return this.statusMessage
    }

    constructor(packet: ResponsePacket, options?: TransportOpts) {
        super(packet, options);
        this.type = packet.type;
        this.status = packet.status ?? this.tHeaders.getStatus();
        this.statusMessage = packet.statusMessage ?? this.tHeaders.getStatusMessage();
        this.error = packet.error;
        if (this.error) {
            this.ok = false;
        }
    }
}