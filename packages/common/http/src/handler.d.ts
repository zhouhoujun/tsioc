import { RequestContext, RequestHandler } from '@tsdi/common';
import { Observable } from 'rxjs';
import { HttpRequest } from './request';
import { HttpEvent } from './response';
/**
 * http handler.
 */
export declare abstract class HttpHandler implements RequestHandler<HttpRequest<any>, HttpEvent<any>> {
    /**
     * http transport handler.
     * @param req http request input.
     */
    abstract handle(req: HttpRequest<any>, context: RequestContext): Observable<HttpEvent<any>>;
}
/**
 * http backend.
 */
export declare abstract class HttpBackend implements RequestHandler<HttpRequest<any>, HttpEvent<any>> {
    /**
     * http transport handler.
     * @param req http request input.
     * @param context request with context for interceptor
     */
    abstract handle(req: HttpRequest<any>, context: RequestContext): Observable<HttpEvent<any>>;
}
/**
 * xhr factory.
 */
export declare abstract class XhrFactory {
    /**
     * build xhr request.
     */
    abstract build(): XMLHttpRequest;
}
