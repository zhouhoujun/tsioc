import { EMPTY_OBJ, InvocationContext, isNumber, isPlainObject, isString } from '@tsdi/ioc';
import { IncomingHeaders, ReqHeaders } from './headers';
import { ParameterCodec, TransportParams } from './params';
import { Pattern, RequestMethod } from './protocols';


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

/**
 * Transforms the Pattern to Route.
 * 1. If Pattern is a `string`, it will be returned as it is.
 * 2. If Pattern is a `number`, it will be converted to `string`.
 * 3. If Pattern is a `JSON` object, it will be transformed to Route. For that end,
 * the function will sort properties of `JSON` Object and creates `route` string
 * according to the following template:
 * <key1>:<value1>/<key2>:<value2>/.../<keyN>:<valueN>
 *
 * @param  {Pattern} pattern - client pattern
 * @returns string
 */
export function patternToPath(pattern: Pattern): string {
    if (isString(pattern) || isNumber(pattern)) {
        return `${pattern}`;
    }
    if (!isPlainObject(pattern)) {
        return pattern;
    }

    const sortedKeys = Object.keys(pattern).sort((a, b) => a.localeCompare(b));

    // Creates the array of Pattern params from sorted keys and their corresponding values
    const sortedPatternParams = sortedKeys.map(key => {
        let partialRoute = `"${key}":`;
        partialRoute += isString(pattern[key])
            ? `"${patternToPath(pattern[key])}"`
            : patternToPath(pattern[key]);
        return partialRoute;
    });

    const route = sortedPatternParams.join(',');
    return `{${route}}`;
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
