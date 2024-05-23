import { Abstract } from '@tsdi/ioc';
import { Pattern } from './pattern';
import { HeaderFields, HeadersLike, TransportHeaders } from './headers';



/**
 * packet data.
 */
export interface PacketInitOpts<T = any> {
    id?: any;
    type?: number | string;
    pattern?: Pattern;
    url?: string;
    topic?: string;
    method?: string;
    headers?: HeadersLike;
    payload?: T;
    error?: any;
}

// export interface PacketData<T = any> extends PacketInitOpts<T> {
//     headerBuffer?: Buffer;
//     headerLength?: number;
//     /**
//      * payload length.
//      */
//     payloadLength?: number | null;
//     streamLength?: number;
// }


/**
 * response packet data.
 */
export interface ResponseInitOpts<T = any, TStatus = any> extends PacketInitOpts<T> {
    type?: number | string;
    status?: TStatus;
    statusMessage?: string;
    ok?: boolean;
    error?: any;
}

export interface PacketOpts {
    readonly headerFields?: HeaderFields;
    readonly defaultMethod?: string;
}

export interface StatusPacketOpts<TStatus = number> extends PacketOpts {
    defaultStatus?: TStatus;
    defaultStatusText?: string
}

/**
 * packet.
 */
export class Packet<T = any> {

    readonly method: string;

    payload: T | null;

    get body(): T | null {
        return this.payload;
    }

    readonly headers: TransportHeaders;
    constructor(init: {
        /**
         * event type
         */
        type?: number;
        method?: string;
        headers?: HeadersLike;
        payload?: T;
    }, options?: PacketOpts) {
        this.headers = new TransportHeaders(init.headers, options?.headerFields);
        this.method = init.method ?? this.headers.getMethod() ?? options?.defaultMethod ?? '';
        this.payload = init.payload ?? null;
    }
}

/**
 * Error packet.
 */
export class ErrorPacket extends Packet {

    readonly error: any | null;

    constructor(init: {
        /**
         * event type
         */
        type?: number;
        error?: any;
        method?: string;
        headers?: HeadersLike;
    }, options: PacketOpts) {
        super(init, options);
        this.error = init.error;
        this.payload = null;
    }
}

/**
 * Response packet.
 */
export class ResponsePacket<T, TStatus = number> extends Packet<T> {
    /**
     * Response status code.
     */
    readonly status: TStatus | null;

    readonly ok: boolean;

    protected _message!: string;
    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    get statusText(): string {
        return this._message
    }

    get statusMessage(): string {
        return this._message
    }

    constructor(init: {
        /**
         * event type
         */
        type?: number;
        method?: string;
        headers?: HeadersLike;
        payload?: T;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
        ok?: boolean;
    }, options?: StatusPacketOpts<TStatus>) {
        super(init, options)
        this.ok = init.ok != false;
        this.status = init.status !== undefined ? init.status : options?.defaultStatus ?? null!;
        this._message = (init.statusMessage || init.statusText) ?? options?.defaultStatusText ?? '';
    }
}

@Abstract()
export abstract class PacketFactory {
    abstract create<T>(packet: PacketInitOpts<T>, options?: PacketOpts): Packet<T>
}