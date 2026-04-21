import { RequestContext } from '@tsdi/common';
import { Observable } from 'rxjs';
import { HttpBackend, HttpHandler } from './handler';
import { HttpRequest } from './request';
import { HttpEvent } from './response';
export declare const JSONP_ERR_NO_CALLBACK = "JSONP injected script did not invoke callback.";
export declare const JSONP_ERR_WRONG_METHOD = "JSONP requests must use JSONP request method.";
export declare const JSONP_ERR_WRONG_RESPONSE_TYPE = "JSONP requests must use Json response type.";
/**
 * DI token/abstract type representing a map of JSONP callbacks.
 *
 * In the browser, this should always be the `window` object.
 *
 *
 */
export declare abstract class JsonpCallbackContext {
    [key: string]: (data: any) => void;
}
/**
 * Processes an `HttpRequest` with the JSONP method,
 * by performing JSONP style requests.
 * @see `HttpHandler`
 * @see `HttpXhrBackend`
 *
 * @publicApi
 */
export declare class JsonpClientBackend implements HttpBackend {
    private callbackMap;
    private document;
    /**
     * A resolved promise that can be used to schedule microtasks in the event handlers.
     */
    private readonly resolvedPromise;
    constructor(callbackMap: JsonpCallbackContext, document: any);
    /**
     * Get the name of the next callback method, by incrementing the global `nextRequestId`.
     */
    private nextCallback;
    /**
     * Processes a JSONP request and returns an event stream of the results.
     * @param req The request object.
     * @returns An observable of the response events.
     *
     */
    handle(req: HttpRequest<never>): Observable<HttpEvent<any>>;
}
/**
 * Identifies requests with the method JSONP and
 * shifts them to the `JsonpClientBackend`.
 *
 * @see `HttpInterceptor`
 *
 * @publicApi
 */
export declare class JsonpInterceptor {
    private jsonp;
    constructor(jsonp: JsonpClientBackend);
    /**
     * Identifies and handles a given JSONP request.
     * @param req The outgoing request object to handle.
     * @param next The next interceptor in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(req: HttpRequest<any>, next: HttpHandler, context: RequestContext): Observable<HttpEvent<any>>;
}
