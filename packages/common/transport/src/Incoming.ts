import { HeadersLike, IHeaders, Packet, PacketOpts, ParameterCodec, Pattern, RequestParams, StatusPacket, StatusPacketOpts } from '@tsdi/common';
import { IReadableStream } from './stream';



/**
 * Incoming message
 */
export interface Incoming<T = any> {

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
export abstract class IncomingFactory implements AbstractIncomingFactory<Incoming> {
    abstract create(options: IncomingOpts): Incoming;
    abstract create<T>(options: IncomingOpts<T>): Incoming<T>;
}

/**
 * incoming options
 */
export interface IncomingOpts<T = any> extends PacketOpts<T> {

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


/**
 * Incoming packet.
 */
export abstract class IncomingPacket<T = any> extends Packet<T> implements Incoming {

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
    abstract clone(update: {
        headers?: HeadersLike;
        params?: RequestParams;
        method?: string;
        body?: T | null;
        payload?: T | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        timeout?: number | null;
    }): IncomingPacket<T>
    abstract clone<V>(update: {
        headers?: HeadersLike;
        params?: RequestParams;
        method?: string;
        body?: V | null;
        payload?: V | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        timeout?: number | null;
    }): IncomingPacket<V>;

    protected override cloneOpts(update: {
        headers?: HeadersLike;
        params?: RequestParams;
        method?: string;
        body?: any;
        payload?: any;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        timeout?: number | null;
    }): IncomingOpts {
        const init = super.cloneOpts(update) as IncomingOpts;
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
        if (this.params.size) rcd.params = this.params.toRecord();
        if (this.method) rcd.method = this.method;
        if (this.timeout) rcd.timeout = this.timeout;
        return rcd;
    }

}


export abstract class PatternIncoming<T = any> extends IncomingPacket<T> {

    constructor(readonly pattern: Pattern, options: IncomingOpts<T>) {
        super(options)
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.pattern = this.pattern;
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
export interface ClientIncomingOpts<T = any, TStatus = any> extends StatusPacketOpts<T, TStatus> {
    streamLength?: number;
}

/**
 * client incoming packet
 */
export abstract class ClientIncomingPacket<T = any, TStatus = any> extends StatusPacket<T, TStatus> implements ClientIncoming<T, TStatus> {


    public streamLength?: number;

    constructor(init: ClientIncomingOpts) {
        super(init);
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
    abstract clone(update: {
        headers?: HeadersLike;
        body?: T | null,
        payload?: T | null;
        setHeaders?: { [name: string]: string | string[]; };
        type?: number;
        ok?: boolean;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
        error?: any;
    }): ClientIncomingPacket<T, TStatus>
    abstract clone<V>(update: {
        headers?: HeadersLike;
        body?: T | null,
        payload?: V | null;
        setHeaders?: { [name: string]: string | string[]; };
        type?: number;
        ok?: boolean;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
        error?: any;
    }): ClientIncomingPacket<V, TStatus>;

}


export abstract class ClientPatternIncoming<T = any, TStatus = any> extends ClientIncomingPacket<T, TStatus> {

    constructor(readonly pattern: Pattern, options: ClientIncomingOpts<T, TStatus>) {
        super(options);
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.pattern = this.pattern;
        return rcd;
    }

}

