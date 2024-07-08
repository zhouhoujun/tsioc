import {
    BasePacket, Clonable, CloneOpts, HeadersLike, IHeaders, PacketOpts, ParameterCodec,
    Pattern, RequestParams, StatusOptions
} from '@tsdi/common';
import { IReadableStream } from './stream';
import { isNil } from '@tsdi/ioc';



/**
 * Incoming message
 */
export interface Incoming<T> {

    id?: number | string;

    url?: string;

    method?: string;

    pattern?: Pattern;

    headers: HeadersLike;

    params?: Record<string, any> | RequestParams;

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
    abstract create<T>(options: IncomingOpts<T>): Incoming<T>;
}

/**
 * incoming options
 */
export interface IncomingOpts<T = any> extends PacketOpts<T> {
    pattern?: Pattern;
    /**
     * request method.
     */
    method?: string;
    /**
     * headers of request.
     */
    headers?: HeadersLike;
    /**
     * request params.
     */
    params?: RequestParams | string
    | ReadonlyArray<[string, string | number | boolean]>
    | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

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
    pattern?: Pattern;
    params?: RequestParams;
    method?: string;
    setParams?: { [param: string]: string; };
    timeout?: number | null;
}

/**
 * Incoming packet.
 */
export abstract class IncomingPacket<T> extends BasePacket<T> implements Incoming<T>, Clonable<IncomingPacket<T>> {

    readonly pattern?: Pattern;
    /**
     * client side timeout.
     */
    readonly timeout?: number;
    readonly method: string;
    readonly params: RequestParams;

    public streamLength?: number;

    public override payload: T | null;

    get body(): T | null {
        return this.payload
    }

    set body(data: T | null) {
        this.payload = data;
    }

    get query(): Record<string, any> {
        return this.params.getQuery();
    }

    constructor(init: IncomingOpts<T>) {
        super(init)
        this.pattern = init.pattern;
        this.payload = init.payload ?? null;
        this.params = new RequestParams(init);
        this.method = init.method ?? this.headers.getMethod() ?? init.defaultMethod ?? '';
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
        // `setParams` are used.
        let params = update.params || this.params;

        // Check whether the caller has asked to set params.
        if (update.setParams) {
            // Set every requested param.
            params = Object.keys(update.setParams)
                .reduce((params, param) => params.set(param, update.setParams![param]), params)
        }
        init.params = params;
        return init;
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        if (this.pattern) rcd.pattern = this.pattern;
        if (this.params.size) rcd.params = this.params.toRecord();
        if (this.method) rcd.method = this.method;
        if (this.timeout) rcd.timeout = this.timeout;
        return rcd;
    }

}


/**
 * Clientincoming message
 */
export interface ClientIncoming<T = any, TStatus = null> {
    /**
     * event type
     */
    type?: number;

    id?: number | string;

    url?: string;

    pattern?: Pattern;

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
    abstract create<T, TStatus>(options: ClientIncomingOpts<T, TStatus>): ClientIncoming<T, TStatus>;
}

/**
 * client incoming init options
 */
export interface ClientIncomingOpts<T = any, TStatus = any> extends PacketOpts<T>, StatusOptions<TStatus> {
    pattern?: Pattern;
    streamLength?: number;
}

export interface ClientIncomingCloneOpts<T, TStatus> extends CloneOpts<T>, StatusOptions<TStatus> {
    pattern?: Pattern;
}


/**
 * client incoming packet
 */
export abstract class ClientIncomingPacket<T, TStatus = any> extends BasePacket<T> implements ClientIncoming<T, TStatus>, Clonable<ClientIncomingPacket<T, TStatus>> {

    readonly pattern?: Pattern;

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
        this.ok = init.error ? false : init.ok != false;
        this.error = init.error;
        this.type = init.type;
        this._status = init.status !== undefined ? init.status : defaultStatus ?? null;
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
        if (this.pattern) rcd.pattern = this.pattern;
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

