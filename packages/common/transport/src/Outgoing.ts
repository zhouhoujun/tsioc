import { AbstractRequest, Header, HeadersLike, StatusOptions, HeaderMappings, IHeaders } from '@tsdi/common';
import { IReadable, IWritable } from './stream';
import { Injectable } from '@tsdi/ioc';
import { StreamAdapter } from './StreamAdapter';




/**
 * Outgoing message
 */
export interface OutgoingMessage<T = any> {
    id?: number | string;

    pattern?: string;

    get headers(): HeadersLike;

    body?: T | null;


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


export type TOutgoing<T extends OutgoingMessage> = T | (T & IWritable);

/**
 * Server outgoing message.
 */
export interface Outgoing<T = any, TStatus = any> extends OutgoingMessage<T> {

    type?: string | number | null;

    error?: any;

    /**
     * Get packet status code.
     *
     * @return {TStatus}
     * @api public
     */
    get statusCode(): TStatus;
    /**
     * Set packet status code.
     *
     * @api public
     */
    set statusCode(code: TStatus);

    /**
     * Get packet status message.
     *
     * @return {String}
     * @api public
     */
    get statusMessage(): string;
    /**
     * Set packet status message
     *
     * @return {TPacket}
     * @api public
     */
    set statusMessage(statusText: string);

    /**
     * has header in packet or not.
     * @param packet 
     * @param field 
     */
    hasHeader(field: string): boolean;
    /**
     * get header from packet.
     * @param packet 
     * @param field 
     */
    getHeader?(field: string): string | undefined;
    /**
     * Set header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.set('Foo', ['bar', 'baz']);
     *    this.set('Accept', 'application/json');
     *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * @param {String|Object|Array} field
     * @param {String} val
     * @api public
     */
    setHeader(field: string, val: Header): void;

    /**
     * remove header in packet.
     * @param packet 
     * @param field 
     */
    removeHeader(field: string): void;

    
    /**
     * get response headers.
     */
    getHeaders?(): IHeaders;

    /**
     * Check if a header has been written to the socket.
     *
     * @return {Boolean}
     * @api public
     */
    headerSent?: boolean;

    /**
     * is writable or not.
     * @param packet 
     */
    writable?: boolean;

}

// /**
//  * Client outgoing message
//  */
// export interface ClientOutgoing<T = any> extends OutgoingMessage<T> {
//     id?: number | string;

//     url?: string;
//     method?: string;

//     params?: Record<string, any>;

//     query?: Record<string, any>;

//     rawBody?: any;

//     path?: any;

// }



export abstract class AbstractOutgoingFactory<T extends OutgoingMessage = OutgoingMessage> {
    abstract create(options: {
        socket?: any;
        pattern?: string;
        headers?: HeadersLike;
        payload?: any;
    }): TOutgoing<T>
}

/**
 * Outgoing factory.
 */
export abstract class OutgoingFactory implements AbstractOutgoingFactory<Outgoing<any>> {
    abstract create(options: {
        socket?: any;
        pattern?: string;
        /**
         * event type
         */
        type?: number;
        status?: any;
        statusMessage?: string;
        statusCode?: any;
        statusText?: string;
        ok?: boolean;
        error?: any;
        headers?: HeadersLike;
        payload?: any;
    }): TOutgoing<Outgoing>
}


// /**
//  * client outgoing factory.
//  */
// export abstract class ClientOutgoingFactory implements AbstractOutgoingFactory<ClientOutgoing> {
//     abstract create(options: {
//         request: AbstractRequest<any>;
//         socket?: any;
//         pattern?: string;
//         headers?: HeadersLike;
//         payload?: any;
//     }): TOutgoing<ClientOutgoing>;
// }


/**
 * Outgoing packet options.
 */
export interface OutgoingOpts<T = any, TStatus = any> extends StatusOptions<TStatus> {
    id?: any;
    pattern?: string;
    headers?: HeadersLike;
    payload?: T;
    body?: T;
}



/**
 * Outgoing packet options.
 */
export interface ClietOutgoingOpts<T = any> {
    pattern?: string;
    headers?: HeadersLike;
    payload?: T;
    body?: T;
}


/**
 * abstract server outgoing.
 */
export abstract class AbstractOutgoing<T, TStatus = any> implements Outgoing<T, TStatus> {
    /**
     * packet id
     */
    id?: string | number;

    /**
     * Type of the response, narrowed to either the full response or the header.
     */
    readonly type: number | undefined;
    readonly pattern?: string;
    readonly error: any | null;
    readonly ok: boolean;
    readonly headers: HeaderMappings;

    protected _status: TStatus | null;
    protected _message: string | undefined;

    constructor(init: OutgoingOpts, defaultStatus?: TStatus, defaultStatusText?: string) {
        this.pattern = init.pattern;
        this.id = init.id;
        this.headers = new HeaderMappings(init.headers);
        this.ok = init.error ? false : init.ok != false;
        this.error = init.error;
        this.type = init.type;
        this._status = init.status !== undefined ? init.status : defaultStatus ?? null;
        this._message = (init.statusMessage || init.statusText) ?? defaultStatusText;
    }

    get statusCode(): TStatus {
        return this._status!;
    }
    set statusCode(code: TStatus) {
        this._status = code;
    }


    get status(): TStatus {
        return this._status!;
    }
    set status(code: TStatus) {
        this._status = code;
    }


    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    set statusText(text: string) {
        this._message = text;
    }

    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    get statusText(): string {
        return this._message!
    }


    set statusMessage(message: string) {
        this._message = message;
    }

    get statusMessage(): string {
        return this._message!
    }

    hasHeader(field: string): boolean {
        return this.headers.has(field)
    }

    getHeader(field: string): string | undefined {
        return this.headers.getHeader(field)
    }

    setHeader(field: string, val: Header): void {
        this.headers.setHeader(field, val);
    }
    removeHeader(field: string): void {
        this.headers.removeHeader(field);
    }

}

/**
 * Url outgoing
 */
export class UrlOutgoing<T = any, TStatus = any> extends AbstractOutgoing<T, TStatus> {
    readonly url: string;
    constructor(init: OutgoingOpts & { url: string }) {
        super(init)
        this.url = init.url;
    }

}



export function parseUrlOutgoing(init: OutgoingOpts<IReadable> & { url: string }): UrlOutgoing<any> & IWritable {
    const incoming = (init.body ?? init.payload) as any;
    incoming.url = init.url;
    incoming.headers = new HeaderMappings(init.headers);
    incoming.pattern = init.pattern;
    incoming.status = init.status ?? init.statusCode;
    incoming.statusMessage = init.statusMessage ?? init.statusText;
    return incoming as (IWritable & UrlOutgoing<any>);
}

@Injectable()
export class UrlOutgoingFactory implements OutgoingFactory {

    constructor(private streamAdapter: StreamAdapter) { }
    create(options: OutgoingOpts & { url: string }): TOutgoing<UrlOutgoing> {
        if (this.streamAdapter.isReadable(options.payload)) {
            return parseUrlOutgoing(options);
        }
        return new UrlOutgoing(options);
    }
}



/**
 * Topic outgoing
 */
export class TopicOutgoing<T = any, TStatus = any> extends AbstractOutgoing<T, TStatus> {
    readonly topic: string;
    constructor(init: OutgoingOpts & { topic: string }) {
        super(init)
        this.topic = init.topic;
    }
}


export function parseTopicOutgoing(init: OutgoingOpts<IReadable> & { topic: string }): TopicOutgoing<any> & IWritable {
    const incoming = (init.body ?? init.payload) as any;
    incoming.topic = init.topic;
    incoming.headers = new HeaderMappings(init.headers);
    incoming.pattern = init.pattern;
    incoming.status = init.status ?? init.statusCode;
    incoming.statusMessage = init.statusMessage ?? init.statusText;
    return incoming as (IWritable & TopicOutgoing<any>);
}

@Injectable()
export class TopicOutgoingFactory implements OutgoingFactory {

    constructor(private streamAdapter: StreamAdapter) { }
    create(options: OutgoingOpts & { topic: string }): TOutgoing<TopicOutgoing> {
        if (this.streamAdapter.isReadable(options.payload)) {
            return parseTopicOutgoing(options);
        }
        return new TopicOutgoing(options);
    }
}


// export interface UrlClientOutgoing<T = any> extends ClientOutgoing<T> {
//     readonly url: string;
// }


// export interface TopicClientOutgoing<T = any> extends ClientOutgoing<T> {
//     readonly topic: string;
// }

