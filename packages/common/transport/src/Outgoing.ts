import { AbstractRequest, BasePacket, Header, HeadersLike, PacketOpts, StatusOptions } from '@tsdi/common';
import { Incoming } from './Incoming';



/**
 * Outgoing packet options.
 */
export interface OutgoingOpts<T = any, TStatus = any> extends PacketOpts<T>, StatusOptions<TStatus> {
    pattern?: string;
}

export abstract class AbstractOutgoingFactory<TInput = any, TOutput = any, TOpts = any> {
    abstract create(input: TInput, options?: TOpts): TOutput;
}

/**
 * Outgoing factory.
 */
export abstract class OutgoingFactory implements AbstractOutgoingFactory<Incoming<any>, Outgoing<any>, OutgoingOpts> {
    abstract create(incoming: Incoming<any>, options?: OutgoingOpts): Outgoing<any>;
}

/**
 * Outgoing packet options.
 */
export interface ClietOutgoingOpts<T = any> extends PacketOpts<T> {
    pattern?: string;
}

export abstract class ClientOutgoingFactory implements AbstractOutgoingFactory<AbstractRequest<any>, ClientOutgoing<any>, ClietOutgoingOpts> {
    abstract create(request: AbstractRequest<any>, options?: ClietOutgoingOpts): ClientOutgoing<any>;

}

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
 * Client Outgoing message
 */
export interface ClientOutgoing<T = any> extends Incoming<T> {

}




/**
 * Outgoing packet options.
 */
export interface OutgoingOpts<T = any, TStatus = any> extends PacketOpts<T>, StatusOptions<TStatus> {
    pattern?: string;
}

export interface OutgoingCloneOpts<T, TStatus> extends StatusOptions<TStatus> {
    pattern?: string;
}


/**
 * Outgoing packet.
 */
export abstract class AbstractOutgoing<T, TStatus = any> extends BasePacket<T> implements Outgoing<T, TStatus> {

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

    constructor(init: OutgoingOpts, defaultStatus?: TStatus, defaultStatusText?: string) {
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

}


