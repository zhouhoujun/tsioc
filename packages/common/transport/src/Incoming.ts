import { CloneOpts, HeadersLike, IHeaders, PacketInitOpts, Packet, ParameterCodec, Pattern, RequestParams, StatusInitOpts, StatusPacket, PayloadOpts, BodyOpts, Clonable } from '@tsdi/common';
import { IReadableStream } from './stream';



/**
 * Incoming message
 */
export interface Incoming<T = any> extends PayloadOpts<T>, BodyOpts<T> {

    id?: number | string;

    url?: string;

    method?: string;

    pattern?: Pattern;

    headers: HeadersLike;

    params?: Record<string, any> | RequestParams;

    query?: Record<string, any>;

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
export abstract class IncomingFactory<TExtOpts = Record<string, any>> implements AbstractIncomingFactory<Incoming> {
    abstract create(options: IncomingInitOpts & BodyOpts & PayloadOpts & TExtOpts): Incoming;
    abstract create<T>(options: IncomingInitOpts & BodyOpts<T> & PayloadOpts<T> & TExtOpts): Incoming<T>;
}

export interface IncomingInitOpts extends PacketInitOpts {

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


export interface IncomingCloneOpts<T = any> extends CloneOpts<T> {
    params?: RequestParams;
    setParams?: { [param: string]: string; };
    method?: string;
    withCredentials?: boolean;
}


/**
 * Incoming packet.
 */
export abstract class IncomingPacket<T = any, TExtOpts = Record<string, any>> extends Packet<T, IncomingInitOpts> implements Incoming, Clonable<IncomingPacket> {

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

    constructor(payload: T | null | undefined, init: IncomingInitOpts) {
        super(payload, init)
        this.payload = payload ?? null;
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

    clone(): IncomingPacket;
    clone(update: IncomingInitOpts & IncomingCloneOpts<T> & TExtOpts): IncomingPacket;
    clone<V>(update: IncomingInitOpts & IncomingCloneOpts<V> & TExtOpts): IncomingPacket<V>;
    clone(update: IncomingInitOpts & IncomingCloneOpts<any> & TExtOpts = {} as any): IncomingPacket {
        const opts = this.cloneOpts(update, update);
        return this.createInstance(opts, update);
    }

    protected abstract createInstance(initOpts: IncomingInitOpts, cloneOpts: IncomingCloneOpts<any> & TExtOpts): IncomingPacket;


    protected override cloneOpts(update: IncomingInitOpts, cloneOpts: IncomingCloneOpts): IncomingInitOpts {
        const init = super.cloneOpts(update, cloneOpts) as IncomingInitOpts;
        init.method = update.method ?? this.method;
        // `setParams` are used.
        let params = update.params as RequestParams || this.params;

        // Check whether the caller has asked to set params.
        if (cloneOpts.setParams) {
            // Set every requested param.
            params = Object.keys(cloneOpts.setParams)
                .reduce((params, param) => params.set(param, cloneOpts.setParams![param]), params)
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


export abstract class PatternIncoming<T = any> extends IncomingPacket<T, { pattern?: Pattern }> {

    constructor(readonly pattern: Pattern, payload: T | null | undefined, init: IncomingInitOpts) {
        super(payload, init)
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
export abstract class ClientIncomingFactory<TExtOpts = Record<string, any>> implements AbstractIncomingFactory<ClientIncoming> {
    abstract create(options: ClientIncomingInitOpts & BodyOpts & PayloadOpts & TExtOpts): ClientIncoming;
    abstract create<T, TStatus>(options: ClientIncomingInitOpts<TStatus> & BodyOpts<T> & PayloadOpts<T> & TExtOpts): ClientIncoming<T, TStatus>;
}

/**
 * client incoming init options
 */
export interface ClientIncomingInitOpts<TStatus = any> extends StatusInitOpts<TStatus> {
    streamLength?: number;
}

/**
 * client incoming packet
 */
export abstract class ClientIncomingPacket<T = any, TStatus = any, TExtOpts = Record<string, any>> extends StatusPacket<T, TStatus, ClientIncomingInitOpts<TStatus>> implements ClientIncoming<T, TStatus>, Clonable<ClientIncomingPacket> {


    public streamLength?: number;

    constructor(payload: T | null | undefined, init: ClientIncomingInitOpts<TStatus>) {
        super(payload, init);
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

    clone(): ClientIncomingPacket;
    clone(update: ClientIncomingInitOpts & CloneOpts<T> & TExtOpts): ClientIncomingPacket;
    clone<V>(update: ClientIncomingInitOpts & CloneOpts<V> & TExtOpts): ClientIncomingPacket<V>;
    clone(update: ClientIncomingInitOpts & CloneOpts<any> & TExtOpts = {} as any): ClientIncomingPacket {
        const opts = this.cloneOpts(update, update);
        return this.createInstance(opts, update);
    }

    protected abstract createInstance(initOpts: ClientIncomingInitOpts, cloneOpts: CloneOpts<any> & TExtOpts): ClientIncomingPacket;

}


export abstract class ClientPatternIncoming<T = any, TStatus = any> extends ClientIncomingPacket<T, TStatus, { pattern?: Pattern }> {

    constructor(readonly pattern: Pattern, payload: T | null | undefined, init: ClientIncomingInitOpts<TStatus>) {
        super(payload, init);
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.pattern = this.pattern;
        return rcd;
    }

}

