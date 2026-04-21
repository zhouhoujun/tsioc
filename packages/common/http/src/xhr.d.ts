import { RequestContext } from '@tsdi/common';
import { Observable } from 'rxjs';
import { HttpBackend, XhrFactory } from './handler';
import { HttpRequest } from './request';
import { HttpEvent } from './response';
/**
 * Uses `XMLHttpRequest` to send requests to a backend server.
 * @see `HttpHandler`
 * @see `JsonpClientBackend`
 *
 * @publicApi
 */
export declare class HttpXhrBackend implements HttpBackend {
    private xhrFactory;
    constructor(xhrFactory: XhrFactory);
    /**
     * Processes a request and returns a stream of response events.
     * @param req The request object.
     * @returns An observable of the response events.
     */
    handle(req: HttpRequest<any>, context: RequestContext): Observable<HttpEvent<any>>;
}
