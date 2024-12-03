import { HeaderMappings, HeadersLike, ParameterCodec, StatusOptions } from '@tsdi/common';



/**
 * Incoming message
 */
export interface Incoming<T> {

    id?: number | string;

    url?: string;
    pattern?: string;
    method?: string;

    get headers(): HeadersLike;

    params?: Record<string, any>;

    query?: Record<string, any>;

    get body(): T | null;
    set body(val: T | null);

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

    /**
     * push chuck.
     * @param chunk 
     * @param encoding 
     */
    push(chunk: any, encoding?: string): boolean;

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
export interface BasicIncomingOpts<T = any> {
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
export abstract class AbstractIncoming<T> implements Incoming<T> {

    readonly pattern?: string;

    readonly headers: HeaderMappings;
    /**
     * client side timeout.
     */
    readonly timeout?: number;

    public streamLength?: number;

    payload: any;

    body: T | null = null;


    query: Record<string, any> | undefined;


    constructor(init: IncomingOpts<T>) {
        this.pattern = init.pattern;
        this.headers = new HeaderMappings(init.headers);
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
 * Client incoming message
 */
export interface ClientIncoming<T = any, TStatus = any> {
    /**
     * event type
     */
    type?: number;

    id?: number | string;

    url?: string;

    pattern?: string;

    get headers(): HeadersLike;

    body?: T | null;

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

    push?(chunk: any, encoding?: string): boolean;

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
export interface UrlClientIncomingOpts<T = any, TStatus = any> extends StatusOptions<TStatus> {
    url: string;
    pattern?: string;
    headers?: HeadersLike;
    payload?: T;
    method?: string;
    streamLength?: number;
}

/**
 * client incoming init options
 */
export interface TopicClientIncomingOpts<T = any, TStatus = any> extends StatusOptions<TStatus> {
    topic: string;
    pattern?: string;
    headers?: HeadersLike;
    payload?: T;
    streamLength?: number;
}

/**
 * client incoming init options
 */
export type ClientIncomingOpts<T = any, TStatus = any> = UrlClientIncomingOpts<T, TStatus> | TopicClientIncomingOpts<T, TStatus>;


/**
 * client incoming packet
 */
export abstract class AbstractClientIncoming<T, TStatus = any> implements ClientIncoming<T, TStatus> {

    readonly pattern?: string | undefined;

    readonly headers: HeaderMappings;

    public streamLength?: number;

    /**
     * Type of the response, narrowed to either the full response or the header.
     */
    public type: number | undefined;
    public error: any | null;
    public ok: boolean;

    protected _status: TStatus | null;
    protected _message: string | undefined;

    payload: any;

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

    set body(value: T | null) {
        this.payload = value;
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
        this.pattern = init.pattern;
        this.headers = new HeaderMappings(init.headers);

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
