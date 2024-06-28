import { InvocationContext } from '@tsdi/ioc';
import { HeadersLike } from './headers';
import { ParameterCodec, RequestParams } from './params';
import { PacketInitOpts, Packet, CloneOpts, PayloadOpts, BodyOpts, Clonable } from './packet';
import { Pattern } from './pattern';



/**
 * response option for request.
 */
export interface ResponseAs {
    /**
     * response observe type
     */
    observe?: 'body' | 'events' | 'response' | 'emit' | 'observe';
    /**
     * response data type.
     */
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
}


export interface RequestInitOpts extends PacketInitOpts, ResponseAs {
    /**
     * request method.
     */
    method?: string;
    /**
     * headers of request.
     */
    headers?: HeadersLike;
    /**
     * request params.
     */
    params?: RequestParams | string
    | ReadonlyArray<[string, string | number | boolean]>
    | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

    /**
     * parameter codec.
     */
    encoder?: ParameterCodec;
    /**
     * for restful
     */
    withCredentials?: boolean;
    /**
     * default method.
     */
    defaultMethod?: string;
    /**
     * request context.
     */
    context?: InvocationContext;
}

export interface RequestOptions<T = any> extends RequestInitOpts, PayloadOpts<T>, BodyOpts<T> {

}


export interface RequestCloneOpts<T> extends CloneOpts<T> {
    params?: RequestParams;
    setParams?: { [param: string]: string; };
    context?: InvocationContext;
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
    method?: string;
    withCredentials?: boolean;
}

/**
 * Request packet.
 */
export abstract class AbstractRequest<T = any, TOpts extends RequestInitOpts = RequestInitOpts> extends Packet<T, TOpts> implements Clonable<AbstractRequest> {

    readonly method: string;
    readonly params: RequestParams;
    readonly context: InvocationContext;
    readonly responseType: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
    readonly observe: 'body' | 'events' | 'response' | 'emit' | 'observe';
    readonly withCredentials: boolean;
    /**
     * request body, payload alias name.
     */
    get body(): T | null {
        return this.payload;
    }

    constructor(payload: T | null | undefined, init: TOpts) {
        super(payload, init)
        this.params = new RequestParams(init);
        this.method = init.method ?? this.headers.getMethod() ?? init.defaultMethod ?? '';
        this.context = init.context!;
        this.responseType = init.responseType ?? 'json';
        this.observe = init.observe ?? 'body';
        this.withCredentials = !!init.withCredentials;
    }

    clone(): AbstractRequest;
    clone(update: TOpts & RequestCloneOpts<T>): AbstractRequest;
    clone<V>(update: TOpts & RequestCloneOpts<V>): AbstractRequest<V>;
    clone(update: TOpts & RequestCloneOpts<any> = {} as any): AbstractRequest {
        const opts = this.cloneOpts(update, update);
        return this.createInstance(opts, update);
    }

    protected abstract createInstance(initOpts: TOpts, cloneOpts: RequestCloneOpts<any>): AbstractRequest;

    protected override cloneOpts(update: TOpts, cloneOpts: RequestCloneOpts<any>): TOpts {
        const init = super.cloneOpts(update, cloneOpts) as TOpts;
        init.method = update.method ?? this.method;
        // `setParams` are used.
        let params = update.params as RequestParams || this.params;

        // Check whether the caller has asked to set params.
        if (cloneOpts.setParams) {
            // Set every requested param.
            params = Object.keys(cloneOpts.setParams)
                .reduce((params, param) => params.set(param, cloneOpts.setParams![param]), params)
        }
        init.params = params;
        // Carefully handle the boolean options to differentiate between
        // `false` and `undefined` in the update args.
        init.withCredentials =
            (update.withCredentials !== undefined) ? update.withCredentials : this.withCredentials;
        init.context = update.context ?? this.context;

        return init;
    }

    protected toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        if (this.params.size) rcd.params = this.params.toRecord();
        if (this.method) rcd.method = this.method;
        rcd.withCredentials = this.withCredentials;
        return rcd;
    }

}

export function appendUrlParams(url: string, reqParams: RequestParams) {
    // If no parameters have been passed in, construct a new HttpUrlEncodedParams instance.
    if (!reqParams.size) {
        return url
    } else {
        // Encode the parameters to a string in preparation for inclusion in the URL.
        const params = reqParams.toString();
        if (params.length === 0) {
            // No parameters, the visible URL is just the URL given at creation time.
            return url
        } else {
            // Does the URL already have query parameters? Look for '?'.
            const qIdx = url.indexOf('?');
            // There are 3 cases to handle:
            // 1) No existing parameters -> append '?' followed by params.
            // 2) '?' exists and is followed by existing query string ->
            //    append '&' followed by params.
            // 3) '?' exists at the end of the url -> append params directly.
            // This basically amounts to determining the character, if any, with
            // which to join the URL and parameters.
            const sep: string = qIdx === -1 ? '?' : (qIdx < url.length - 1 ? '&' : '');
            return url + sep + params
        }

    }
}

/**
 * Request init options.
 */
export interface UrlRequestInitOpts extends RequestInitOpts {
    reportProgress?: boolean;
}


export interface UrlRequestCloneOpts<T = any> extends RequestCloneOpts<T> {
    url?: string;
}

/**
 * url Request.
 */
export class UrlRequest<T = any> extends AbstractRequest<T, UrlRequestInitOpts> {

    readonly reportProgress: boolean;
    readonly url: string;
    readonly urlWithParams: string | undefined;

    constructor(url: string, body: T | null, options: UrlRequestInitOpts) {
        super(body, options)
        this.reportProgress = !!options.reportProgress;

        this.url = url;
        this.urlWithParams = appendUrlParams(url, this.params);
    }

    // clone(): UrlRequest<T>;
    // clone(update: UrlRequestCloneOpts): UrlRequest<T>
    // clone<V>(update: UrlRequestCloneOpts<V>): UrlRequest<V>;
    // clone(update: UrlRequestCloneOpts<any> = {}): UrlRequest {
    //     const url = update.url || this.url;

    //     const init = this.cloneOpts(update);

    //     // Finally, construct the new HttpRequest using the pieces from above.
    //     return new UrlRequest(url, init)
    // }

    protected override createInstance(initOpts: UrlRequestInitOpts, cloneOpts: UrlRequestCloneOpts): UrlRequest {
        const url = cloneOpts.url || this.url;
        const payload = this.updatePayload(cloneOpts);
        return new UrlRequest(url, payload, initOpts)
    }

    protected override cloneOpts(update: UrlRequestInitOpts, cloneOpts: UrlRequestCloneOpts<any>): UrlRequestInitOpts {
        const init = super.cloneOpts(update, cloneOpts) as UrlRequestInitOpts;
        init.reportProgress =
            (update.reportProgress !== undefined) ? update.reportProgress : this.reportProgress;

        return init;

    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.url = this.urlWithParams;
        return rcd;
    }
}



export interface PatterRequestCloneOpts<T = any> extends RequestCloneOpts<T> {
    pattern?: Pattern;
}

/**
 * Pattern Request.
 */
export class PatternRequest<T = any> extends AbstractRequest<T, RequestInitOpts> {

    readonly pattern: Pattern;
    readonly params: RequestParams;
    readonly withCredentials: boolean;

    /**
     * client side timeout.
     */
    readonly timeout?: number;

    constructor(pattern: Pattern, body: T | null | undefined, options: RequestInitOpts) {
        super(body, options)
        this.params = new RequestParams(options);
        this.withCredentials = !!options.withCredentials;
        this.pattern = pattern;
    }

    // clone(): PatternRequest<T>;
    // clone(update: PatterRequestCloneOpts<T>): PatternRequest<T>
    // clone<V>(update: PatterRequestCloneOpts<V>): PatternRequest<V>;
    // clone(update: PatterRequestCloneOpts<any> = {}): PatternRequest {
    //     const pattern = update.pattern || this.pattern;

    //     const options = this.cloneOpts(update);
    //     // Finally, construct the new HttpRequest using the pieces from above.
    //     return new PatternRequest(pattern, options)
    // }

    protected createInstance(initOpts: RequestInitOpts, cloneOpts: PatterRequestCloneOpts): PatternRequest {
        const pattern = cloneOpts.pattern || this.pattern;
        const payload = this.updatePayload(cloneOpts);
        return new PatternRequest(pattern, payload, initOpts);
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.pattern = this.pattern;

        return rcd;
    }
}

