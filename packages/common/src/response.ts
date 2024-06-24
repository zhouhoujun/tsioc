import { Abstract, EMPTY, Injectable, hasOwn, isPlainObject, lang } from '@tsdi/ioc';
import { HeadersLike } from './headers';
import { StatusPacket, StatusPacketOpts } from './packet';
import { Pattern } from './pattern';

/**
 * response packet data.
 */
export interface ResponseInitOpts<T = any, TStatus = any> extends StatusPacketOpts<T, TStatus> {
    url?: string;
    pattern?: Pattern;
}

export abstract class ResponseBase<T = any, TStatus = any> extends StatusPacket<T, TStatus> {
    readonly url: string | undefined;
    readonly pattern: Pattern | undefined;
    constructor(init: ResponseInitOpts) {
        super(init);
        this.url = init.url;
        this.pattern = init.pattern;
    }

    protected override cloneOpts(update: {
        url?: string;
        pattern?: Pattern;
        headers?: HeadersLike;
        payload?: any;
        setHeaders?: { [name: string]: string | string[]; };
        type?: number;
        ok?: boolean;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
        error?: any;
    }): ResponseInitOpts {
        const opts = super.cloneOpts(update) as ResponseInitOpts;
        if (update.url) {
            opts.url = update.url;
        } else if (update.pattern) {
            opts.pattern = update.pattern;
        }
        return opts;

    }

    protected override isIngores(name: string): boolean {
        return ['url', 'pattern'].indexOf(name)>=0 || super.isIngores(name)
    }

    override toJson(ignores?: string[]): Record<string, any> {
        const red = super.toJson(ignores);
        if (this.url) {
            red.url = this.url;
        } else if (this.pattern) {
            red.pattern = this.pattern;
        }
        return red;

    }
}

/**
 * header response.
 */
export class HeaderResponse<TStatus = number> extends ResponseBase<null, TStatus> {
    constructor(init: {
        url?: string;
        pattern?: Pattern;
        /**
         * event type
         */
        type?: number;
        ok?: boolean;
        headers?: HeadersLike;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
    }) {
        super(Object.assign(init, { payload: null }));
    }


    clone(): HeaderResponse<TStatus>;
    clone(update: {
        url?: string;
        pattern?: Pattern;
        type?: number;
        ok?: boolean;
        headers?: HeadersLike;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
        setHeaders?: { [name: string]: string | string[]; };
    }): HeaderResponse<TStatus>
    clone(update: {
        url?: string;
        pattern?: Pattern;
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
export class ResponsePacket<T = any, TStatus = number> extends ResponseBase<T, TStatus> {

    constructor(init: {
        url?: string;
        pattern?: Pattern;
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
    }) {
        super(init)
    }

    clone(): ResponsePacket<T, TStatus>;
    clone(update: {
        url?: string;
        pattern?: Pattern;
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
        url?: string;
        pattern?: Pattern;
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
        url?: string;
        pattern?: Pattern;
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
export class ErrorResponse<TStatus = number> extends ResponseBase<null, TStatus> {

    readonly error: any | null;

    constructor(init: {
        url?: string;
        pattern?: Pattern;
        /**
         * event type
         */
        type?: number;
        headers?: HeadersLike;
        error?: any;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
    }) {
        super(Object.assign(init, { ok: false, payload: null }));
    }

    clone(): ErrorResponse<TStatus>;
    clone(update: {
        url?: string;
        pattern?: Pattern;
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
        url?: string;
        pattern?: Pattern;
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

export function isResponseEvent(target: any): target is ResponseEvent {
    if (!target) return false;
    return target instanceof ResponseBase || (isPlainObject(target) && hasOwn(target, 'type'));
}

@Abstract()
export abstract class ResponseFactory<TStatus = null> {
    /**
     * create response.
     * @param options 
     */
    abstract create<T>(options: ResponseInitOpts): ResponseEvent<T, TStatus>;
}

@Injectable()
export class DefaultResponseFactory<TStatus = null> {

    create<T>(options: ResponseInitOpts): ResponseEvent<T, TStatus> {

        if (!options.ok || options.error) {
            return new ErrorResponse(options);
        }
        return new ResponsePacket(options);

    }
}