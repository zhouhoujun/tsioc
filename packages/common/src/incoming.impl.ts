import { Abstract, Injectable, Provider, StaticProvider } from '@tsdi/ioc';
import { BaseIncoming, Incoming, IncomingMessage, ClientIncoming, TopicIncoming, UrlIncoming } from './incoming';
import { HeaderMappings, HeadersLike } from './headers';
import { ParameterCodec } from './params';
import { IReadable, ReadableLike } from './stream';
import { StreamAdapter } from './StreamAdapter';
import { StatusOptions } from './response';




/**
 * Abstract incoming factory.
 */
@Abstract()
export abstract class AbstractIncomingFactory<T extends IncomingMessage = IncomingMessage> {
    abstract create(options: any): ReadableLike<T>;
}

/**
 * server incoming factory.
 */
@Abstract()
export abstract class IncomingFactory implements AbstractIncomingFactory<Incoming<any>> {
    abstract create(options: IncomingOpts): ReadableLike<Incoming<any>>;
}

/**
 * Client incoming factory.
 */
@Abstract()
export abstract class ClientIncomingFactory implements AbstractIncomingFactory<ClientIncoming> {
    abstract create(options: ClientIncomingOpts): ReadableLike<ClientIncoming>;
}


/**
 * incoming options
 */
export interface BasicIncomingOpts<T = any> {
    id?: any;
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
@Abstract()
export abstract class AbstractIncoming<T> implements BaseIncoming<T> {

    readonly id?: any;

    readonly pattern?: string;

    readonly headers: HeaderMappings;

    readonly properties?: Record<string, any>;
    /**
     * client side timeout.
     */
    readonly timeout?: number;

    body?: T | null;


    query: Record<string, any> | undefined;

    get paths() {
        return this.pattern;
    }

    constructor(init: IncomingOpts<T>) {
        this.id = init.id;
        this.pattern = init.pattern;
        this.headers = new HeaderMappings(init.headers);
        this.body = init.body ?? init.payload;
        this.query = init.query ?? init.params;
        this.timeout = init.timeout;
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
export class DefaultUrlIncoming<T = any> extends AbstractIncoming<T> implements UrlIncoming<T> {


    url: string;
    method: string;

    get paths() {
        return this.url;
    }

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



export function parseUrlIncoming(init: UrlIncomingOptions<IReadable>): UrlIncoming<any> {
    const incoming = (init.body ?? init.payload) as any;
    incoming.id = init.id;
    incoming.url = init.url;
    incoming.method = init.method ?? init.defaultMethod ?? '';
    incoming.headers = new HeaderMappings(init.headers);
    incoming.pattern = init.pattern;
    return incoming as (IReadable & UrlIncoming<any>);
}


@Injectable()
export class UrlIncomingFactory implements IncomingFactory {

    constructor(private streamAdapter: StreamAdapter) { }
    create(options: UrlIncomingOptions): ReadableLike<UrlIncoming> {
        if (this.streamAdapter.isReadable(options.body ?? options.payload)) {
            return parseUrlIncoming(options);
        }
        return new DefaultUrlIncoming(options);
    }
}


/**
 * Incoming packet.
 */
export class DefaultTopicIncoming<T = any> extends AbstractIncoming<T> implements TopicIncoming<T> {


    readonly topic: string;
    readonly responseTopic: string | undefined;

    get paths() {
        return this.topic;
    }


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

}

export function parseTopicIncoming(init: TopicIncomingOptions<IReadable>): TopicIncoming<any> & IReadable {
    const incoming = (init.body ?? init.payload) as any;
    incoming.id = init.id;
    incoming.topic = init.topic;
    incoming.headers = new HeaderMappings(init.headers);
    incoming.pattern = init.pattern;
    return incoming as (IReadable & TopicIncoming<any>);
}

@Injectable()
export class TopicIncomingFactory implements IncomingFactory {

    constructor(private streamAdapter: StreamAdapter) { }
    create(options: TopicIncomingOptions): ReadableLike<TopicIncoming> {
        if (this.streamAdapter.isReadable(options.body ?? options.payload)) {
            return parseTopicIncoming(options);
        }
        return new DefaultTopicIncoming(options);
    }
}






/**
 * client incoming init options
 */
export interface UrlClientIncomingOpts<T = any, TStatus = any> extends StatusOptions<TStatus> {
    url: string;
    pattern?: string;
    headers?: HeadersLike;
    payload?: T;
    body?: T;
    method?: string;
}

/**
 * client incoming init options
 */
export interface TopicClientIncomingOpts<T = any, TStatus = any> extends StatusOptions<TStatus> {
    topic: string;
    params?: any;
    pattern?: string;
    headers?: HeadersLike;
    payload?: T;
    body?: T;
}

/**
 * client incoming init options
 */
export type ClientIncomingOpts<T = any, TStatus = any> = UrlClientIncomingOpts<T, TStatus> | TopicClientIncomingOpts<T, TStatus>;


/**
 * client incoming packet
 */
@Abstract()
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


    get statusCode(): TStatus {
        return this._status!;
    }

    get status(): TStatus {
        return this._status!;
    }

    /**
     * body, payload alias name.
     */
    body?: T | null;

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
        this.body = init.body ?? init.payload;
        this._status = init.status ?? init.statusCode ?? defaultStatus ?? null;
        this._message = (init.statusMessage || init.statusText) ?? defaultStatusText;
        this.ok = this.isOk(init);
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

}


export class UrlClientIncoming<T = any, TStatus = any> extends AbstractClientIncoming<T, TStatus> {

    readonly url: string;
    constructor(init: UrlClientIncomingOpts, defaultStatus?: TStatus, defaultStatusText?: string) {
        super(init, defaultStatus, defaultStatusText);
        this.url = init.url;

    }

}

@Injectable()
export class UrlClientIncomingFactory implements ClientIncomingFactory {

    constructor(private streamAdapter: StreamAdapter) { }

    create<T = any>(options: UrlClientIncomingOpts<any, any>): ReadableLike<UrlClientIncoming<T>> {
        if (this.streamAdapter.isReadable(options.body ?? options.payload)) {
            return parseUrlClientIncoming(options);
        }
        return new UrlClientIncoming(options);
    }
}

export function parseUrlClientIncoming<TStatus>(init: UrlClientIncomingOpts<IReadable>, defaultStatus?: TStatus, defaultStatusText?: string): UrlClientIncoming<any, TStatus> & IReadable {
    const incoming = (init.body ?? init.payload) as any;
    incoming.url = init.url;
    incoming.headers = new HeaderMappings(init.headers);
    incoming.pattern = init.pattern;
    incoming.status = init.status ?? init.statusCode ?? defaultStatus;
    incoming.statusText = init.statusText ?? init.statusMessage ?? defaultStatusText;
    incoming.body = incoming;
    return incoming as (IReadable & UrlClientIncoming<any, TStatus>);
}


export class TopicClientIncoming<T, TStatus = any> extends AbstractClientIncoming<T, TStatus> {

    readonly topic: string;
    constructor(init: TopicClientIncomingOpts, defaultStatus?: TStatus, defaultStatusText?: string) {
        super(init, defaultStatus, defaultStatusText);
        this.topic = init.topic;

    }

}

export function parseTopicClientIncoming<TStatus>(init: TopicClientIncomingOpts<IReadable>, defaultStatus?: TStatus, defaultStatusText?: string): TopicClientIncoming<any, TStatus> & IReadable {
    const incoming = (init.body ?? init.payload) as any;
    incoming.topic = init.topic;
    incoming.headers = new HeaderMappings(init.headers);
    incoming.pattern = init.pattern;
    incoming.status = init.status ?? init.statusCode ?? defaultStatus;
    incoming.statusText = init.statusText ?? init.statusMessage ?? defaultStatusText;
    incoming.body = incoming;
    return incoming as (IReadable & TopicClientIncoming<any, TStatus>);
}


@Injectable()
export class TopicClientIncomingFactory implements ClientIncomingFactory {

    constructor(private streamAdapter: StreamAdapter) { }

    create<T = any>(options: TopicClientIncomingOpts<any, any>): ReadableLike<TopicClientIncoming<T>> {
        if (this.streamAdapter.isReadable(options.body ?? options.payload)) {
            return parseTopicClientIncoming(options);
        }
        return new TopicClientIncoming(options);
    }
}


export function provideIncomings(): StaticProvider[] {
    return [
        UrlClientIncomingFactory,
        TopicClientIncomingFactory
    ]
}