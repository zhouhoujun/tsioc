import { Abstract, InvocationContext } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Endpoint, EndpointBackend } from '@tsdi/core';
import { HttpRequest } from './request';
import { HttpEvent } from './response';

/**
 * http handler.
 */
@Abstract()
export abstract class HttpHandler implements Endpoint<HttpRequest, HttpEvent> {
    /**
     * http transport handler.
     * @param req http request input.
     * @param context request with context for interceptor
     */
    abstract handle(req: HttpRequest, context: InvocationContext): Observable<HttpEvent>;
}

/**
 * http backend.
 */
@Abstract()
export abstract class HttpBackend implements EndpointBackend<HttpRequest, HttpEvent> {
    /**
     * http transport handler.
     * @param req http request input.
     * @param context request with context for interceptor
     */
    abstract handle(req: HttpRequest, context: InvocationContext): Observable<HttpEvent>;
}

/**
 * xhr factory.
 */
@Abstract()
export abstract class XhrFactory {
    /**
     * build xhr request.
     */
    abstract build(): XMLHttpRequest;
}

