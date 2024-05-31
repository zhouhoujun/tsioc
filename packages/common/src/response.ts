import { isPlainObject, isUndefined } from '@tsdi/ioc';
import { HeadersLike } from './headers';
import { PacketInitOpts, StatusPacket, StatusPacketOpts } from './packet';


/**
 * response packet data.
 */
export interface ResponseInitOpts<T = any, TStatus = any> extends PacketInitOpts<T> {
    /**
     * event type
     */
    type?: number;
    status?: TStatus;
    statusMessage?: string;
    statusText?: string;
    ok?: boolean;
    error?: any;
}

/**
 * header response.
 */
export class HeaderResponse<TStatus = number> extends StatusPacket<null, TStatus> {
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
    }, options?: StatusPacketOpts<TStatus>) {
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
        const init = {} as ResponseInitOpts;
        this.cloneHeaderBody(init, update);
        this.cloneStatus(init, update);

        return new HeaderResponse(init) as HeaderResponse<any>;

    }
}

/**
 * response packet.
 */
export class ResponsePacket<T = any, TStatus = number> extends StatusPacket<T, TStatus> {

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
    }, options?: StatusPacketOpts<TStatus>) {
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
        const init = {} as ResponseInitOpts;
        this.cloneHeaderBody(init, update);
        this.cloneStatus(init, update);

        return new ResponsePacket(init) as ResponsePacket<any, TStatus>;

    }
}

/**
 * Error packet.
 */
export class ErrorResponse<TStatus = number> extends StatusPacket<null, TStatus> {

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
    }, options?: StatusPacketOpts<TStatus>) {
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
        const init = {
            error: update.error ?? this.error
        } as ResponseInitOpts;
        this.cloneHeaderBody(init, update);
        this.cloneStatus(init, update);

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

export function isEvent(response: ResponseEvent): response is ResponseEventPacket {
    return isPlainObject(response) && isUndefined(response.type)
}


/**
 * Url response event
 */
export type UrlResponseEvent<T = any, TStatus = any> = ResponseEvent<T, TStatus> & { url: string };

