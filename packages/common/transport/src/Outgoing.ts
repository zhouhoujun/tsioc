import { isNil } from '@tsdi/ioc';
import { BasePacket, Clonable, CloneOpts, Header, HeadersLike, IHeaders, Jsonable, PacketOpts, StatusOptions } from '@tsdi/common';
import { IWritableStream } from './stream';
import { Incoming } from './Incoming';


/**
 * Outgoing message.
 */
export interface Outgoing<T, TStatus = any> {

    id?: string | number;
    type?: string | number | null;

    pattern?: string;

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
    abstract create(incoming: Incoming<any>, options?: OutgoingPacketOpts): Outgoing<any>;
    abstract create<T, TStatus>(incoming: Incoming<any>, options?: OutgoingPacketOpts<T, TStatus>): Outgoing<T, TStatus>;
}



/**
 * Outgoing packet options.
 */
export interface OutgoingPacketOpts<T = any, TStatus = any> extends PacketOpts<T>, StatusOptions<TStatus> {
    pattern?: string;
}

export interface OutgoingCloneOpts<T, TStatus> extends CloneOpts<T>, StatusOptions<TStatus> {
    pattern?: string;
}


/**
 * Outgoing packet.
 */
export abstract class OutgoingPacket<T, TStatus = any> extends BasePacket<T> implements Outgoing<T, TStatus>, Clonable<OutgoingPacket<T, TStatus>>, Jsonable {

    /**
     * Type of the response, narrowed to either the full response or the header.
     */
    readonly type: number | undefined;
    readonly pattern?: string;
    readonly error: any | null;
    readonly ok: boolean;
    public override payload: T | null;

    protected _status: TStatus | null;
    protected _message: string | undefined;

    constructor(init: OutgoingPacketOpts, defaultStatus?: TStatus, defaultStatusText?: string) {
        super(init);
        this.pattern = init.pattern;
        this.payload = init.payload ?? null;
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

    getHeader(field: string): string | number | string[] | undefined {
        return this.headers.getHeader(field)
    }

    setHeader(field: string, val: Header): void {
        this.headers.setHeader(field, val);
    }
    removeHeader(field: string): void {
        this.headers.removeHeader(field);
    }


    abstract clone(): OutgoingPacket<T, TStatus>;
    abstract clone<V>(update: OutgoingCloneOpts<V, TStatus>): OutgoingPacket<V, TStatus>;
    abstract clone(update: OutgoingCloneOpts<T, TStatus>): OutgoingPacket<T, TStatus>;

    protected override cloneOpts(update: OutgoingCloneOpts<any, TStatus>): OutgoingPacketOpts {
        const init = super.cloneOpts(update) as OutgoingPacketOpts;
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
        if (this.pattern) rcd.pattern = this.pattern;
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
