import { Header, HeadersLike, IHeaders, Pattern, StatusPacket, StatusPacketOpts } from '@tsdi/common';
import { IWritableStream } from './stream';

/**
 * Outgoing message.
 */
export interface Outgoing<T = any> {

    id?: string | number;
    type?: string | number | null;

    pattern?: Pattern;

    body?: T | null;

    error?: any;

    headers: HeadersLike;

    /**
     * Get packet status code.
     *
     * @return {TStatus}
     * @api public
     */
    get statusCode(): any;
    /**
     * Set packet status code.
     *
     * @api public
     */
    set statusCode(code: any);

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
    getHeader(field: string): string | number | string[] | undefined;
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
 * Outgoing stream.
 */
export interface OutgoingStream extends IWritableStream {
    headers?: IHeaders;
}


/**
 * Outgoing factory.
 */
export abstract class OutgoingFactory {
    abstract create(): Outgoing;
    abstract create<T>(): Outgoing<T>;
}



/**
 * Outgoing packet options.
 */
export interface OutgoingPacketOpts<T = any, TStatus = any> extends StatusPacketOpts<T> {
    /**
     * event type
     */
    type?: number;
    status?: TStatus;
    statusMessage?: string;
    statusText?: string;
    ok?: boolean;
    error?: any;

    defaultStatus?: TStatus;
    defaultStatusText?: string;
}


/**
 * Outgoing packet.
 */
export abstract class OutgoingPacket<T = any, TStatus = number> extends StatusPacket<T, TStatus> {

    constructor(init: OutgoingPacketOpts) {
        super(init)
    }


    abstract clone(): OutgoingPacket<T, TStatus>;
    abstract clone(update: {
        headers?: HeadersLike;
        payload?: T | null;
        setHeaders?: { [name: string]: string | string[]; };
        type?: number;
        ok?: boolean;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
        error?: any;
    }): OutgoingPacket<T, TStatus>
    abstract clone<V>(update: {
        headers?: HeadersLike;
        payload?: V | null;
        setHeaders?: { [name: string]: string | string[]; };
        type?: number;
        ok?: boolean;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
        error?: any;
    }): OutgoingPacket<V, TStatus>;


}



/**
 * client incoming init options
 */
export interface ClientIncomingOpts<T = any, TStatus = any> extends OutgoingPacketOpts<T, TStatus> {
    
}

/**
 * client incoming packet
 */
export abstract class ClientIncomingPacket<T = any, TStatus = number> extends OutgoingPacket<T, TStatus> {

    constructor(init: ClientIncomingOpts) {
        super(init);
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