import { BasePacket, HeadersLike, PacketOpts, ParameterCodec, StatusOptions } from '@tsdi/common';



/**
 * Incoming message
 */
export abstract class Incoming<T> {

    id?: number | string;

    url?: string;
    pattern?: string;
    method?: string;

    abstract get headers(): HeadersLike;

    params?: Record<string, any>;

    query?: Record<string, any>;

    abstract get body(): T | null;
    abstract set body(val: T | null);

    rawBody?: any;

    path?: any;

    /**
     * has header in packet or not.
     * @param packet 
     * @param field 
     */
    abstract hasHeader?(field: string): boolean;
    /**
     * get header from packet.
     * @param packet 
     * @param field 
     */
    abstract getHeader?(field: string): string | undefined;

    
    abstract push(chunk: any, encoding?: string): boolean;

}

/**
 * Abstract incoming factory.
 */
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
export interface BasicIncomingOpts<T = any> extends PacketOpts<T> {
    /**
     * pattern.
     */
    pattern?: string;
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

    streamLength?: number;
}

/**
 * Url incoming options.
 */
export interface UrlIncomingOptions<T = any> extends BasicIncomingOpts<T> {
    /**
     * request url.
     */
    url: string;
    /**
     * request method.
     */
    method?: string;
    /**
     * for restful
     */
    withCredentials?: boolean;

    defaultMethod?: string;
}

/**
 * Topic incoming options.
 */
export interface TopicIncomingOptions<T = any> extends BasicIncomingOpts<T> {
    /**
     * request url.
     */
    topic: string;
    /**
     * response topic.
     */
    responseTopic?: string;
}

/**
 * Stream incoming options.
 */
export interface StreamIncomingOptions<T = any> extends BasicIncomingOpts<T> {
    req: any;
    res: any;
}

/**
 * incoming options
 */
export type IncomingOpts<T = any> = UrlIncomingOptions<T> | TopicIncomingOptions<T> | StreamIncomingOptions<T>;



/**
 * Incoming base packet.
 */
export abstract class AbstractIncoming<T> extends BasePacket<T> implements Incoming<T> {

    readonly pattern?: string;
    /**
     * client side timeout.
     */
    readonly timeout?: number;

    public streamLength?: number;

    get body(): T | null {
        return this.payload
    }

    set body(data: T | null) {
        this.payload = data;
    }

    query: Record<string, any> | undefined;


    constructor(init: IncomingOpts<T>) {
        super(init);
        this.pattern = init.pattern;
        this.payload = init.payload ?? null;
        this.query = init.query ?? init.params;
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

    
    abstract push(chunk: any, encoding?: string): boolean;

}


/**
 * Incoming packet.
 */
export abstract class UrlIncoming<T> extends AbstractIncoming<T> implements Incoming<T> {


    readonly url: string;
    readonly method: string;


    constructor(init: UrlIncomingOptions<T>) {
        super(init);
        this.url = init.url;
        this.method = init.method ?? init.defaultMethod ?? '';
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

}


/**
 * Incoming packet.
 */
export abstract class TopicIncoming<T> extends AbstractIncoming<T> implements Incoming<T> {


    readonly topic: string;
    readonly responseTopic: string | undefined;


    constructor(init: TopicIncomingOptions<T>) {
        super(init);
        this.topic = init.topic;
        this.responseTopic = init.responseTopic;
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

    abstract push(chunk: any, encoding?: string): boolean;

}


/**
 * Clientincoming message
 */
export abstract class ClientIncoming<T = any, TStatus = any> {
    /**
     * event type
     */
    type?: number;

    id?: number | string;

    url?: string;

    pattern?: string;

    abstract get headers(): HeadersLike;

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
    abstract hasHeader?(field: string): boolean;
    /**
     * get header from packet.
     * @param packet 
     * @param field 
     */
    abstract getHeader?(field: string): string | undefined;

    abstract push(chunk: any, encoding?: string): boolean;

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
export interface UrlClientIncomingOpts<T = any, TStatus = any> extends PacketOpts<T>, StatusOptions<TStatus> {
    url: string;
    pattern?: string;
    method?: string;
    streamLength?: number;
}

/**
 * client incoming init options
 */
export interface TopicClientIncomingOpts<T = any, TStatus = any> extends PacketOpts<T>, StatusOptions<TStatus> {
    topic: string;
    pattern?: string;
    streamLength?: number;
}

/**
 * client incoming init options
 */
export type ClientIncomingOpts<T = any, TStatus = any> = UrlClientIncomingOpts<T, TStatus> | TopicClientIncomingOpts<T, TStatus>;


/**
 * client incoming packet
 */
export abstract class AbstractClientIncoming<T, TStatus = any> extends BasePacket<T> implements ClientIncoming<T, TStatus> {

    readonly pattern?: string | undefined;

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
        this.pattern = init.pattern;

        this.error = init.error;
        this.type = init.type;
        this._status = init.status ?? init.statusCode ?? defaultStatus ?? null;
        this._message = (init.statusMessage || init.statusText) ?? defaultStatusText;
        this.ok = this.isOk(init);
        this.streamLength = init.streamLength;
    }

    protected isOk(init: ClientIncomingOpts) {
        return init.error ? false : init.ok != false
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

    
    abstract push(chunk: any, encoding?: string): boolean;

}


export abstract class UrlClientIncoming<T = any, TStatus = any> extends AbstractClientIncoming<T, TStatus> {

    readonly url: string;
    constructor(init: UrlClientIncomingOpts, defaultStatus?: TStatus, defaultStatusText?: string) {
        super(init, defaultStatus, defaultStatusText);
        this.url = init.url;

    }

}


export abstract class TopicClientIncoming<T, TStatus = any> extends AbstractClientIncoming<T, TStatus> {

    readonly topic: string;
    constructor(init: TopicClientIncomingOpts, defaultStatus?: TStatus, defaultStatusText?: string) {
        super(init, defaultStatus, defaultStatusText);
        this.topic = init.topic;

    }

}
