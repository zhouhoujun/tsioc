import { isNil } from '@tsdi/ioc';
import {
    BasePacket, Clonable, CloneOpts, HeadersLike, PacketOpts, ParameterCodec, StatusOptions
} from '@tsdi/common';



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

export interface StreamIncomingOptions<T = any> extends BasicIncomingOpts<T> {
    req: any;
    res: any;
}

/**
 * incoming options
 */
export type IncomingOpts<T = any> = UrlIncomingOptions<T> | TopicIncomingOptions<T> | StreamIncomingOptions<T>;


export interface IncomingCloneOpts<T> extends CloneOpts<T> {
    pattern?: string;
    query?: Record<string, any>;
    method?: string;
    timeout?: number | null;
}



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

    // abstract clone(): AbstractIncoming<T>;
    // abstract clone<V>(update: IncomingCloneOpts<V>): AbstractIncoming<V>;
    // abstract clone(update: IncomingCloneOpts<T>): AbstractIncoming<T>;

    // protected override cloneOpts(update: IncomingCloneOpts<any>): IncomingOpts {
    //     const init = super.cloneOpts(update) as IncomingOpts;
    //     init.pattern = update.pattern ?? this.pattern;

    //     init.query = update.query ? { ...this.query, ...update.query } : this.query;
    //     return init;
    // }

    // protected override toRecord(): Record<string, any> {
    //     const rcd = super.toRecord();
    //     if (this.pattern) rcd.pattern = this.pattern;
    //     if (this.query) rcd.query = this.query;
    //     if (this.timeout) rcd.timeout = this.timeout;
    //     return rcd;
    // }

}


export interface UrlIncomingCloneOpts<T = any> extends IncomingCloneOpts<T> {

    /**
     * request url.
     */
    url?: string;
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
 * Incoming packet.
 */
export abstract class UrlIncoming<T> extends AbstractIncoming<T> implements Incoming<T>, Clonable<UrlIncoming<T>> {


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

    abstract clone(): UrlIncoming<T>;
    abstract clone<V>(update: UrlIncomingCloneOpts<V>): UrlIncoming<V>;
    abstract clone(update: UrlIncomingCloneOpts<T>): UrlIncoming<T>;

    // protected override cloneOpts(update: UrlIncomingCloneOpts<any>): UrlIncomingOptions {
    //     const init = super.cloneOpts(update) as UrlIncomingOptions;
    //     init.method = update.method ?? this.method;

    //     return init;
    // }

    // protected override toRecord(): Record<string, any> {
    //     const rcd = super.toRecord();
    //     if (this.url) rcd.url = this.url;
    //     if (this.method) rcd.method = this.method;
    //     return rcd;
    // }

}



export interface TopicIncomingCloneOptions<T = any> extends IncomingCloneOpts<T> {
    /**
     * request url.
     */
    topic?: string;
    /**
     * response topic.
     */
    responseTopic?: string;
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

    // abstract clone(): TopicIncoming<T>;
    // abstract clone<V>(update: TopicIncomingCloneOptions<V>): TopicIncoming<V>;
    // abstract clone(update: TopicIncomingCloneOptions<T>): TopicIncoming<T>;

    // protected override cloneOpts(update: TopicIncomingCloneOptions<any>): TopicIncomingOptions {
    //     const init = super.cloneOpts(update) as TopicIncomingOptions;
    //     init.topic = update.topic ?? this.topic;
    //     init.responseTopic = update.responseTopic ?? this.responseTopic;

    //     return init;
    // }

    // protected override toRecord(): Record<string, any> {
    //     const rcd = super.toRecord();
    //     if (this.topic) rcd.topic = this.topic;
    //     if (this.responseTopic) rcd.responseTopic = this.responseTopic;
    //     return rcd;
    // }

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

export interface ClientIncomingCloneOpts<T, TStatus = any> extends CloneOpts<T>, StatusOptions<TStatus> {
    pattern?: string;
}

export interface UrlClientIncomingCloneOpts<T, TStatus = any> extends ClientIncomingCloneOpts<T, TStatus> {
    url?: string;
}

export interface TopicClientIncomingCloneOpts<T, TStatus = any> extends ClientIncomingCloneOpts<T, TStatus> {
    topic?: string;
}


/**
 * client incoming packet
 */
export abstract class AbstractClientIncoming<T, TStatus = any> extends BasePacket<T> implements ClientIncoming<T, TStatus>, Clonable<AbstractClientIncoming<T, TStatus>> {

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

    abstract clone(): AbstractClientIncoming<T, TStatus>;
    abstract clone<V>(update: ClientIncomingCloneOpts<V, TStatus>): AbstractClientIncoming<V, TStatus>;
    abstract clone(update: ClientIncomingCloneOpts<T, TStatus>): AbstractClientIncoming<T, TStatus>;

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


export abstract class UrlClientIncoming<T = any, TStatus = any> extends AbstractClientIncoming<T, TStatus> {

    readonly url: string;
    constructor(init: UrlClientIncomingOpts, defaultStatus?: TStatus, defaultStatusText?: string) {
        super(init, defaultStatus, defaultStatusText);
        this.url = init.url;

    }

    abstract clone(): UrlClientIncoming<T, TStatus>;
    abstract clone<V>(update: UrlClientIncomingCloneOpts<V, TStatus>): UrlClientIncoming<V, TStatus>;
    abstract clone(update: UrlClientIncomingCloneOpts<T, TStatus>): UrlClientIncoming<T, TStatus>;

    protected override cloneOpts(update: UrlClientIncomingCloneOpts<any, TStatus>): UrlClientIncomingOpts {

        const init = super.cloneOpts(update) as UrlClientIncomingOpts;

        init.url = update.url ?? this.url;

        return init;
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.url = this.url;
        return rcd;
    }
}


export abstract class TopicClientIncoming<T, TStatus = any> extends AbstractClientIncoming<T, TStatus> {

    readonly topic: string;
    constructor(init: TopicClientIncomingOpts, defaultStatus?: TStatus, defaultStatusText?: string) {
        super(init, defaultStatus, defaultStatusText);
        this.topic = init.topic;

    }

    abstract clone(): TopicClientIncoming<T, TStatus>;
    abstract clone<V>(update: TopicClientIncomingCloneOpts<V, TStatus>): TopicClientIncoming<V, TStatus>;
    abstract clone(update: TopicClientIncomingCloneOpts<T, TStatus>): TopicClientIncoming<T, TStatus>;

    protected override cloneOpts(update: TopicClientIncomingCloneOpts<any, TStatus>): TopicClientIncomingOpts {

        const init = super.cloneOpts(update) as TopicClientIncomingOpts;

        init.topic = update.topic ?? this.topic;

        return init;
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.topic = this.topic;
        return rcd;
    }
}
