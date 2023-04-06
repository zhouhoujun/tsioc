import { Abstract, EMPTY_OBJ, InvocationContext } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { IncomingHeaders, ReqHeaders, ResHeaders } from './headers';
import { ParameterCodec, TransportParams } from './params';
import { Pattern, patternToPath } from './pattern';
import { RequestMethod } from './protocols';


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

    readonly context: InvocationContext | undefined;

    readonly responseType: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
    readonly observe: 'body' | 'events' | 'response';
    readonly reportProgress: boolean;
    readonly withCredentials: boolean;

    constructor(pattern: Pattern, options: RequestInit = EMPTY_OBJ) {
        this.url = patternToPath(pattern);
        this.pattern = pattern;
        this.method = options.method;
        this.params = new TransportParams(options);
        this.context = options.context;
        this.responseType = options.responseType ?? 'json';
        this.reportProgress = !!options.reportProgress;
        this.withCredentials = !!options.withCredentials;
        this.observe = options.observe || 'body';
        this.body = options.body ?? options.payload ?? null;
        this.headers = new ReqHeaders(options.headers ?? options.options);
    }

}


@Abstract()
export abstract class Redirector {
    /**
     * redirect.
     */
    abstract redirect<TRes, TReq = any>(req: TReq, status: number | string, headers: ResHeaders): Observable<TRes>
}


/**
 * restful request option.
 */
export interface RequestOptions {
    /**
     * request method.
     */
    method?: RequestMethod;
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

export interface RequestInit extends RequestOptions {
    reportProgress?: boolean;
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
    observe?: 'body' | 'events' | 'response';
    withCredentials?: boolean;
}



/**
 * response option for request.
 */
export interface ResponseAs {
    /**
     * response observe type
     */
    observe?: 'body' | 'events' | 'response';
    /**
     * response data type.
     */
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
}
