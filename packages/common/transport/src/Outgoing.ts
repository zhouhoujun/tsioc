import { Clonable, CloneOpts, Header, HeadersLike, IHeaders, Pattern, StatusInitOpts, StatusPacket } from '@tsdi/common';
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
export interface OutgoingPacketOpts<T = any, TStatus = any> extends StatusInitOpts<TStatus> {
    payload?: T | null;
}


/**
 * Outgoing packet.
 */
export abstract class OutgoingPacket<T = any, TStatus = any, TExtOpts = Record<string, any>> extends StatusPacket<T, TStatus> implements Outgoing<T, TStatus>, Clonable<OutgoingPacket> {


    constructor(init: OutgoingPacketOpts<T, TStatus>) {
        super(null, init)
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


    clone(): OutgoingPacket;
    clone(update: OutgoingPacketOpts<T> & CloneOpts<T> & TExtOpts): OutgoingPacket;
    clone<V>(update: OutgoingPacketOpts<V> & CloneOpts<T> & TExtOpts): OutgoingPacket<V>;
    clone(update: OutgoingPacketOpts<any> & CloneOpts<T> & TExtOpts = {} as any): OutgoingPacket {
        const opts = this.cloneOpts(update, update);
        return this.createInstance(opts, update);
    }

    protected abstract createInstance(initOpts: OutgoingPacketOpts, update: CloneOpts<T> & TExtOpts): OutgoingPacket;



}


export abstract class PatternOutgoing<T = any, TStatus = any> extends OutgoingPacket<T, TStatus, { pattern?: Pattern }> {

    constructor(readonly pattern: Pattern, options: OutgoingPacketOpts<T, TStatus>) {
        super(options);
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.pattern = this.pattern;
        return rcd;
    }

}