import { Abstract, EMPTY_OBJ, InvocationContext } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { IncomingHeaders, ReqHeaders, ResHeaders } from './headers';
import { ParameterCodec, TransportParams } from './params';
import { Pattern, patternToPath } from './pattern';


/**
 * Client Request.
 */
export class TransportRequest<T = any> {

    readonly url: string;
    readonly method: string | undefined;
    readonly pattern?: Pattern;
    readonly params: TransportParams;
    public body: T | null;
    readonly headers: ReqHeaders;

    readonly context: InvocationContext;

    readonly responseType: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
    readonly observe: 'body' | 'events' | 'response' | 'emit';
    readonly reportProgress: boolean;
    readonly withCredentials: boolean;
    readonly urlWithParams: string;

    constructor(pattern: Pattern, options: RequestInitOpts = EMPTY_OBJ) {
        const url = this.url = patternToPath(pattern);
        this.pattern = pattern;
        this.method = options.method;
        this.params = new TransportParams(options);
        this.context = options.context!;
        this.responseType = options.responseType ?? 'json';
        this.reportProgress = !!options.reportProgress;
        this.withCredentials = !!options.withCredentials;
        this.observe = options.observe || 'body';
        this.body = options.body ?? options.payload ?? null;
        this.headers = new ReqHeaders(options.headers ?? options.options);

        // If no parameters have been passed in, construct a new HttpUrlEncodedParams instance.
        if (!this.params.size) {
            this.urlWithParams = url
        } else {
            // Encode the parameters to a string in preparation for inclusion in the URL.
            const params = this.params.toString();
            if (params.length === 0) {
                // No parameters, the visible URL is just the URL given at creation time.
                this.urlWithParams = url
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
                this.urlWithParams = url + sep + params
            }
        }
    }

    clone(update: {
        headers?: ReqHeaders | undefined;
        context?: InvocationContext<any> | undefined;
        reportProgress?: boolean | undefined;
        params?: TransportParams | undefined;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        withCredentials?: boolean | undefined; body?: any;
        method?: string | undefined;
        url?: Pattern | undefined;
        setHeaders?: { [name: string]: string | string[]; } | undefined;
        setParams?: { [param: string]: string; } | undefined;
    } = {}): TransportRequest<T> {
        const method = update.method || this.method;
        const url = update.url || this.url;
        const responseType = update.responseType || this.responseType;

        // The body is somewhat special - a `null` value in update.body means
        // whatever current body is present is being overridden with an empty
        // body, whereas an `undefined` value in update.body implies no
        // override.
        const body = (update.body !== undefined) ? update.body : this.body;

        // Carefully handle the boolean options to differentiate between
        // `false` and `undefined` in the update args.
        const withCredentials =
            (update.withCredentials !== undefined) ? update.withCredentials : this.withCredentials;
        const reportProgress =
            (update.reportProgress !== undefined) ? update.reportProgress : this.reportProgress;

        // Headers and params may be appended to if `setHeaders` or
        // `setParams` are used.
        let headers = update.headers || this.headers;
        let params = update.params || this.params;
        const context = update.context ?? this.context;
        // Check whether the caller has asked to add headers.
        if (update.setHeaders !== undefined) {
            // Set every requested header.
            headers =
                Object.keys(update.setHeaders)
                    .reduce((headers, name) => headers.set(name, update.setHeaders![name]), headers)
        }

        // Check whether the caller has asked to set params.
        if (update.setParams) {
            // Set every requested param.
            params = Object.keys(update.setParams)
                .reduce((params, param) => params.set(param, update.setParams![param]), params)
        }

        // Finally, construct the new HttpRequest using the pieces from above.
        return new TransportRequest(url, {
            method,
            body,
            params,
            headers,
            reportProgress,
            responseType,
            withCredentials,
            context
        })
    }

}


@Abstract()
export abstract class Redirector<TStatus = number> {
    /**
     * redirect.
     */
    abstract redirect<T>(req: TransportRequest, status: TStatus, headers: ResHeaders): Observable<T>
}


/**
 * restful request option.
 */
export interface RequestOptions {
    /**
     * request method.
     */
    method?: string;
    /**
     * request body.
     */
    body?: any;
    /**
     * payload request.
     */
    payload?: any;
    /**
     * alias name of headers
     */
    options?: IncomingHeaders | ReqHeaders;
    /**
     * headers of request.
     */
    headers?: IncomingHeaders | ReqHeaders;
    /**
     * request context.
     */
    context?: InvocationContext;
    /**
     * request params.
     */
    params?: TransportParams | string
    | ReadonlyArray<[string, string | number | boolean]>
    | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

    /**
     * parameter codec.
     */
    encoder?: ParameterCodec;
}

/**
 * response option for request.
 */
export interface ResponseAs {
    /**
     * response observe type
     */
    observe?: 'body' | 'events' | 'response' | 'emit';
    /**
     * response data type.
     */
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
}

export interface RequestInitOpts extends RequestOptions, ResponseAs {
    reportProgress?: boolean;
    withCredentials?: boolean;
}


