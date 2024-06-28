import { Abstract, EMPTY, Injectable, hasOwn, isPlainObject, isString, lang } from '@tsdi/ioc';
import { HeadersLike } from './headers';
import { Clonable, CloneOpts, Packet, StatusInitOpts, StatusPacket } from './packet';
import { Pattern } from './pattern';

/**
 * response packet data.
 */
export interface ResponseInitOpts<TStatus = number> extends StatusInitOpts<TStatus> {
    url?: string;
    pattern?: Pattern;
}

export interface ResponseCloneOpts<T = any> extends CloneOpts<T> {
    url?: string;
    pattern?: Pattern;
}

export abstract class ResponseBase<T = any, TStatus = number> extends StatusPacket<T, TStatus, ResponseInitOpts<TStatus>> implements Clonable<ResponseBase<any, TStatus>> {
    readonly url: string | undefined;
    readonly pattern: Pattern | undefined;
    constructor(payload: T | null | undefined, init: ResponseInitOpts<TStatus>) {
        super(payload, init);
        this.url = init.url;
        this.pattern = init.pattern;
    }

    clone(): ResponseBase<T, TStatus>;
    clone(update: ResponseInitOpts<TStatus> & ResponseCloneOpts<T>): ResponseBase<T, TStatus>;
    clone<V>(update: ResponseInitOpts<TStatus> & ResponseCloneOpts<V>): ResponseBase<V, TStatus>;
    clone(update: ResponseInitOpts<TStatus> & ResponseCloneOpts<any> = {} as any): ResponseBase<any, TStatus> {
        const opts = this.cloneOpts(update, update);
        return this.createInstance(opts, update);
    }

    protected abstract createInstance(initOpts: ResponseInitOpts<TStatus>, cloneOpts: ResponseCloneOpts): ResponseBase<any, TStatus>;

    protected override cloneOpts(update: ResponseInitOpts<TStatus>, cloneOpts: ResponseCloneOpts): ResponseInitOpts<TStatus> {
        const opts = super.cloneOpts(update, cloneOpts) as ResponseInitOpts<TStatus>;
        if (update.url) {
            opts.url = update.url;
        } else if (update.pattern) {
            opts.pattern = update.pattern;
        }
        return opts;

    }

    protected override toRecord(): Record<string, any> {
        const red = super.toRecord();
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
    constructor(init: ResponseInitOpts<TStatus>) {
        super(null, init);
    }

    protected override createInstance(initOpts: ResponseInitOpts<TStatus>, cloneOpts: ResponseCloneOpts): HeaderResponse<TStatus> {
        return new HeaderResponse(initOpts);
    }

}

/**
 * response packet.
 */
export class ResponsePacket<T = any, TStatus = number> extends ResponseBase<T, TStatus> {

    protected override createInstance(initOpts: ResponseInitOpts<TStatus>, cloneOpts: ResponseCloneOpts): ResponsePacket<T, TStatus> {
        return new ResponsePacket(this.updatePayload(cloneOpts), initOpts);
    }
}

/**
 * Error packet.
 */
export class ErrorResponse<TStatus = number> extends ResponseBase<null, TStatus> {

    constructor(init: ResponseInitOpts<TStatus>) {
        super(null, init);
    }

    protected createInstance(initOpts: ResponseInitOpts<TStatus>, cloneOpts: ResponseCloneOpts): ErrorResponse<TStatus> {
        return new ErrorResponse(initOpts);
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

export interface ResponseOptions<T = any, TStatus = any> extends ResponseInitOpts<TStatus> {
    body?: T | null;
    payload?: T | null
}

@Abstract()
export abstract class ResponseFactory<TStatus = null> {
    /**
     * create response.
     * @param options 
     */
    abstract create<T>(options: ResponseOptions): ResponseEvent<T, TStatus>;
}

@Injectable()
export class DefaultResponseFactory<TStatus = null> {

    create<T>(options: ResponseOptions<T, TStatus>): ResponseEvent<T, TStatus> {

        if (!options.ok || options.error) {
            return new ErrorResponse(options);
        }
        return new ResponsePacket<T, TStatus>(options.body ?? options.payload, options);

    }
}