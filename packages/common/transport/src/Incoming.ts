import { isNil } from '@tsdi/ioc';
import {
    BasePacket, Clonable, CloneOpts, HeadersLike, IHeaders, PacketOpts, ParameterCodec, StatusOptions
} from '@tsdi/common';
import { IReadableStream } from './stream';




/**
 * Incoming message
 */
export interface Incoming<T> {

    id?: number | string;

    url?: string;
    pattern?: string;
    method?: string;

    headers: HeadersLike;

    params?: Record<string, any>;

    query?: Record<string, any>

    payload?: any;

    body?: T | null

    rawBody?: any;

    path?: any;

    /**
     * has header in packet or not.
     * @param packet 
     * @param field 
     */
    hasHeader?(field: string): boolean;
    /**
     * get header from packet.
     * @param packet 
     * @param field 
     */
    getHeader?(field: string): string | undefined;

}

/**
 * Incoming stream
 */
export interface IncomingStream extends IReadableStream {
    get headers(): IHeaders;
}


export abstract class AbstractIncomingFactory<TIcoming = any> {
    abstract create(options: any): TIcoming;
}

/**
 * Incoming factory.
 */
export abstract class IncomingFactory implements AbstractIncomingFactory<Incoming<any>> {
    abstract create(options: IncomingOpts): Incoming<any>;
}

/**
 * incoming options
 */
export interface IncomingOpts<T = any> extends PacketOpts<T> {
    url?: string;
    topic?: string;
    pattern?: string;
    req?: any;
    res?: any;
    /**
     * request method.
     */
    method?: string;
    /**
     * headers of request.
     */
    headers?: HeadersLike;
    /**
     * request query params.
     */
    params?: Record<string, any>;
    /**
     * request query params.
     */
    query?: Record<string, any>;

    /**
     * parameter codec.
     */
    encoder?: ParameterCodec;
    /**
     * request payload, request body.
     */
    payload?: T;
    /**
     * request body. alias of payload.
     */
    body?: T | null;
    /**
     * request timeout
     */
    timeout?: number;
    /**
     * for restful
     */
    withCredentials?: boolean;

    defaultMethod?: string;

    streamLength?: number;

}

export interface IncomingCloneOpts<T> extends CloneOpts<T> {
    pattern?: string;
    query?: Record<string, any>;
    method?: string;
    timeout?: number | null;
}

/**
 * Incoming packet.
 */
export abstract class IncomingPacket<T> extends BasePacket<T> implements Incoming<T>, Clonable<IncomingPacket<T>> {

    readonly pattern?: string;
    /**
     * client side timeout.
     */
    readonly timeout?: number;
    readonly method: string;

    public streamLength?: number;

    public override payload: T | null;

    get body(): T | null {
        return this.payload
    }

    set body(data: T | null) {
        this.payload = data;
    }

    query: Record<string, any> | undefined;


    constructor(init: IncomingOpts<T>) {
        super(init);
        this.pattern = init.pattern ?? init.url ?? init.topic;
        this.payload = init.payload ?? null;
        this.query = init.query ?? init.params;
        this.method = init.method ?? init.defaultMethod ?? '';
        this.timeout = init.timeout;
        this.streamLength = init.streamLength;
    }

    /**
     * has header in packet or not.
     * @param packet 
     * @param field 
     */
    hasHeader(field: string): boolean {
        return this.headers.has(field)
    }
    /**
     * get header from packet.
     * @param packet 
     * @param field 
     */
    getHeader(field: string): string | undefined {
        return this.headers.getHeader(field);
    }

    abstract clone(): IncomingPacket<T>;
    abstract clone<V>(update: IncomingCloneOpts<V>): IncomingPacket<V>;
    abstract clone(update: IncomingCloneOpts<T>): IncomingPacket<T>;

    protected override cloneOpts(update: IncomingCloneOpts<any>): IncomingOpts {
        const init = super.cloneOpts(update) as IncomingOpts;
        init.pattern = update.pattern ?? this.pattern;
        init.method = update.method ?? this.method;

        init.query = update.query ? { ...this.query, ...update.query } : this.query;
        return init;
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        if (this.pattern) rcd.pattern = this.pattern;
        if (this.query) rcd.query = this.query;
        if (this.method) rcd.method = this.method;
        if (this.timeout) rcd.timeout = this.timeout;
        return rcd;
    }

}


/**
 * Clientincoming message
 */
export interface ClientIncoming<T = any, TStatus = any> {
    /**
     * event type
     */
    type?: number;

    id?: number | string;

    url?: string;

    pattern?: string;

    headers: HeadersLike;

    body?: T | null

    status?: TStatus | null;

    statusCode?: TStatus | null;

    statusMessage?: string;

    statusText?: string;

    ok?: boolean;
    error?: any;

    /**
     * has header in packet or not.
     * @param packet 
     * @param field 
     */
    hasHeader?(field: string): boolean;
    /**
     * get header from packet.
     * @param packet 
     * @param field 
     */
    getHeader?(field: string): string | undefined;

}


/**
 * Incoming factory.
 */
export abstract class ClientIncomingFactory implements AbstractIncomingFactory<ClientIncoming> {
    abstract create(options: ClientIncomingOpts): ClientIncoming;
}

/**
 * client incoming init options
 */
export interface ClientIncomingOpts<T = any, TStatus = any> extends PacketOpts<T>, StatusOptions<TStatus> {
    url?: string;
    topic?: string;
    pattern?: string;
    method?: string;
    streamLength?: number;
}

export interface ClientIncomingCloneOpts<T, TStatus> extends CloneOpts<T>, StatusOptions<TStatus> {
    pattern?: string;
}


/**
 * client incoming packet
 */
export abstract class ClientIncomingPacket<T, TStatus = any> extends BasePacket<T> implements ClientIncoming<T, TStatus>, Clonable<ClientIncomingPacket<T, TStatus>> {

    readonly pattern?: string;

    public streamLength?: number;

    /**
     * Type of the response, narrowed to either the full response or the header.
     */
    readonly type: number | undefined;
    readonly error: any | null;
    readonly ok: boolean;

    protected _status: TStatus | null;
    protected _message: string | undefined;

    get statusCode(): TStatus {
        return this._status!;
    }

    get status(): TStatus {
        return this._status!;
    }

    /**
     * body, payload alias name.
     */
    get body(): T | null {
        return this.payload;
    }

    /**
      * Textual description of response status code, defaults to OK.
      *
      * Do not depend on this.
      */
    get statusText(): string {
        return this._message!
    }

    get statusMessage(): string {
        return this._message!
    }

    constructor(init: ClientIncomingOpts, defaultStatus?: TStatus, defaultStatusText?: string) {
        super(init);
        this.pattern = init.pattern ?? init.url ?? init.topic;

        this.ok = init.error ? false : init.ok != false;
        this.error = init.error;
        this.type = init.type;
        this._status = init.status ?? init.statusCode ?? defaultStatus ?? null;
        this._message = (init.statusMessage || init.statusText) ?? defaultStatusText;
        this.streamLength = init.streamLength;
    }

    /**
     * has header in packet or not.
     * @param packet 
     * @param field 
     */
    hasHeader(field: string): boolean {
        return this.headers.has(field)
    }
    /**
     * get header from packet.
     * @param packet 
     * @param field 
     */
    getHeader(field: string): string | undefined {
        return this.headers.getHeader(field);
    }

    abstract clone(): ClientIncomingPacket<T, TStatus>;
    abstract clone<V>(update: ClientIncomingCloneOpts<V, TStatus>): ClientIncomingPacket<V, TStatus>;
    abstract clone(update: ClientIncomingCloneOpts<T, TStatus>): ClientIncomingPacket<T, TStatus>;

    protected override cloneOpts(update: ClientIncomingCloneOpts<any, TStatus>): ClientIncomingOpts {
        const init = super.cloneOpts(update) as ClientIncomingOpts;

        init.pattern = update.pattern ?? this.pattern;

        init.type = update.type ?? this.type;
        init.ok = update.ok ?? this.ok;
        const status = update.status ?? this.statusCode;
        if (status !== null) {
            init.status = status;
        }
        if (this.error || update.error) {
            init.error = update.error ?? this.error
        }
        init.statusMessage = update.statusMessage ?? update.statusText ?? this.statusMessage;
        return init
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.pattern = this.pattern;
        if (!isNil(this.type)) rcd.type = this.type;
        if (!isNil(this.statusCode)) rcd.status = this.statusCode;
        if (this.statusMessage) rcd.statusMessage = this.statusMessage;

        rcd.ok = this.ok;

        if (this.error) {
            rcd.error = this.error
        }
        return rcd;
    }

}

