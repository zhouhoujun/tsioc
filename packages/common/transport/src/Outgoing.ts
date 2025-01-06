import { AbstractRequest, Header, HeadersLike, StatusOptions, HeaderMappings } from '@tsdi/common';




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

    write?(data: any, cb?: (err?: Error | null) => void): boolean;
    write?(data: any, encoding?: string, cb?: (err?: Error | null) => void): boolean;
    end?(cb?: () => void): this;
    end?(data: any, cb?: () => void): this;
    end?(data: any, encoding?: string, cb?: () => void): this;
}

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
     * Check if a header has been written to the socket.
     *
     * @return {Boolean}
     * @api public
     */
    sent?: boolean;

    /**
     * is writable or not.
     * @param packet 
     */
    writable?: boolean;

}

/**
 * Client outgoing message
 */
export interface ClientOutgoing<T = any> extends OutgoingMessage<T> {
    id?: number | string;

    url?: string;
    method?: string;

    params?: Record<string, any>;

    query?: Record<string, any>;

    rawBody?: any;

    path?: any;

}


export abstract class AbstractOutgoingFactory<TOutgoing extends OutgoingMessage = OutgoingMessage> {
    abstract create(options: {
        socket?: any;
        pattern?: string;
        headers?: HeadersLike;
        payload?: any;
    }): TOutgoing
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
    }): Outgoing
}


/**
 * client outgoing factory.
 */
export abstract class ClientOutgoingFactory implements AbstractOutgoingFactory<ClientOutgoing> {
    abstract create(options: {
        request: AbstractRequest<any>;
        socket?: any;
        pattern?: string;
        headers?: HeadersLike;
        payload?: any;
    }): ClientOutgoing<any>;
}


/**
 * Outgoing packet options.
 */
export interface OutgoingOpts<T = any, TStatus = any> extends StatusOptions<TStatus> {
    pattern?: string;
    headers?: HeadersLike;
    payload?: T;
}



/**
 * Outgoing packet options.
 */
export interface ClietOutgoingOpts<T = any> {
    pattern?: string;
    headers?: HeadersLike;
    payload?: T;
}



/**
 * Outgoing packet options.
 */
export interface OutgoingOpts<T = any, TStatus = any> extends StatusOptions<TStatus> {
    id?: any;
    pattern?: string;
    headers?: HeadersLike;
    payload?: T;
}

export interface OutgoingCloneOpts<T, TStatus> extends StatusOptions<TStatus> {
    pattern?: string;
}


/**
 * Server outgoing.
 */
export abstract class ServerOutgoing<T, TStatus = any> implements Outgoing<T, TStatus> {
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

    abstract write(data: any, cb?: (err?: Error | null) => void): boolean;
    abstract write(data: any, encoding?: string, cb?: (err?: Error | null) => void): boolean;
    abstract end(cb?: () => void): this;
    abstract end(data: any, cb?: () => void): this;
    abstract end(data: any, encoding?: string, cb?: () => void): this;

}


