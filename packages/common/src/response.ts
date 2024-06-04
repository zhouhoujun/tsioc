import { Abstract } from '@tsdi/ioc';
import { HeadersLike } from './headers';
import { OutgoingInitOpts, OutgoingPacket, OutgoingPacketOpts } from './outgoing';


/**
 * response packet data.
 */
export interface ResponseInitOpts<T = any, TStatus = any> extends OutgoingInitOpts<T, TStatus>, OutgoingPacketOpts<TStatus> { }

/**
 * header response.
 */
export class HeaderResponse<TStatus = number> extends OutgoingPacket<null, TStatus> {
    constructor(init: {
        /**
         * event type
         */
        type?: number;
        ok?: boolean;
        headers?: HeadersLike;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
    }, options?: ResponseInitOpts<null, TStatus>) {
        super(Object.assign(init, { payload: null }), options);
    }


    clone(): HeaderResponse<TStatus>;
    clone(update: {
        type?: number;
        ok?: boolean;
        headers?: HeadersLike;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
        setHeaders?: { [name: string]: string | string[]; };
    }): HeaderResponse<TStatus>
    clone(update: {
        type?: number;
        ok?: boolean;
        headers?: HeadersLike;
        status?: any;
        statusMessage?: string;
        statusText?: string;
        setHeaders?: { [name: string]: string | string[]; }
    } = {}): HeaderResponse<TStatus> {
        const init = this.cloneOpts(update) as ResponseInitOpts;
        return new HeaderResponse(init) as HeaderResponse<any>;

    }
}

/**
 * response packet.
 */
export class ResponsePacket<T = any, TStatus = number> extends OutgoingPacket<T, TStatus> {

    constructor(init: {
        /**
         * event type
         */
        type?: number;
        headers?: HeadersLike;
        payload?: T;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
        ok?: boolean;
    }, options?: ResponseInitOpts<T, TStatus>) {
        super(init, options)
    }

    clone(): ResponsePacket<T, TStatus>;
    clone(update: {
        type?: number;
        ok?: boolean;
        headers?: HeadersLike;
        payload?: T;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
        setHeaders?: { [name: string]: string | string[]; };
    }): ResponsePacket<T, TStatus>;
    clone<V>(update: {
        type?: number;
        ok?: boolean;
        headers?: HeadersLike;
        payload?: V;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
        setHeaders?: { [name: string]: string | string[]; };
    }): ResponsePacket<V, TStatus>;
    clone(update: {
        type?: number;
        ok?: boolean;
        headers?: HeadersLike;
        payload?: any;
        status?: any;
        statusMessage?: string;
        statusText?: string;
        setHeaders?: { [name: string]: string | string[]; }
    } = {}): ResponsePacket<any, TStatus> {
        const init = this.cloneOpts(update);
        return new ResponsePacket(init) as ResponsePacket<any, TStatus>;

    }
}

/**
 * Error packet.
 */
export class ErrorResponse<TStatus = number> extends OutgoingPacket<null, TStatus> {

    readonly error: any | null;

    constructor(init: {
        /**
         * event type
         */
        type?: number;
        headers?: HeadersLike;
        error?: any;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
    }, options?: ResponseInitOpts<null, TStatus>) {
        super(Object.assign(init, { ok: false, payload: null }), options);
    }

    clone(): ErrorResponse<TStatus>;
    clone(update: {
        type?: number;
        ok?: boolean;
        headers?: HeadersLike;
        error?: any;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
        setHeaders?: { [name: string]: string | string[]; };
    }): ErrorResponse<TStatus>
    clone(update: {
        type?: number;
        ok?: boolean;
        headers?: HeadersLike;
        error?: any;
        status?: any;
        statusMessage?: string;
        statusText?: string;
        setHeaders?: { [name: string]: string | string[]; }
    } = {}): ErrorResponse<TStatus> {
        const init = this.cloneOpts(update);
        init.error = update.error ?? this.error;
        return new ErrorResponse(init) as ErrorResponse<any>;

    }
}

/**
 * event response.
 */
export interface ResponseEventPacket {
    type: number;
}

/**
 * An error that represents a failed attempt to JSON.parse text coming back
 * from the server.
 *
 * It bundles the Error object with the actual response body that failed to parse.
 *
 */
export interface ResponseJsonParseError {
    error: Error;
    text: string;
}

/**
 * Response Event
 */
export type ResponseEvent<T = any, TStatus = any> = HeaderResponse<TStatus> | ResponsePacket<T, TStatus> | ErrorResponse<TStatus> | ResponseEventPacket;



/**
 * Url response event
 */
export type UrlResponseEvent<T = any, TStatus = any> = ResponseEvent<T, TStatus> & { url: string };


@Abstract()
export abstract class ResponseFactory<TStatus = null> {
    /**
     * create response.
     * @param options 
     */
    abstract create<T>(options: ResponseInitOpts): ResponseEvent<T, TStatus>;
}