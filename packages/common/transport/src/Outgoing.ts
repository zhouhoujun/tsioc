import { Header, HeadersLike, IHeaders, Pattern, StatusPacket, StatusPacketOpts } from '@tsdi/common';
import { IWritableStream } from './stream';
import { Incoming } from './Incoming';

/**
 * Outgoing message.
 */
export interface Outgoing<T = any, TStatus = any> {

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
    abstract create(incoming: Incoming, options?: OutgoingPacketOpts): Outgoing;
    abstract create<T, TStatus>(incoming: Incoming, options?: OutgoingPacketOpts<T, TStatus>): Outgoing<T, TStatus>;
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
export abstract class OutgoingPacket<T = any, TStatus = number> extends StatusPacket<T, TStatus> implements Outgoing<T, TStatus> {


    constructor(init: OutgoingPacketOpts) {
        super(init)
    }

    get statusCode(): TStatus {
        return this._status!;
    }
    set statusCode(code: TStatus) {
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


    setHeader(field: string, val: Header): void {
        this.headers.setHeader(field, val);
    }
    removeHeader(field: string): void {
        this.headers.removeHeader(field);
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


