import { Abstract } from '@tsdi/ioc';
import { Backend, Handler } from '@tsdi/core';
import { Observable } from 'rxjs';
import { HttpRequest } from './request';
import { HttpEvent } from './response';

/**
 * http handler.
 */
@Abstract()
export abstract class HttpHandler implements Handler<HttpRequest, HttpEvent> {
    /**
     * http transport handler.
     * @param req http request input.
     * @param context request with context for interceptor
     */
    abstract handle(req: HttpRequest): Observable<HttpEvent>;
}

/**
 * http backend.
 */
@Abstract()
export abstract class HttpBackend implements Backend<HttpRequest, HttpEvent> {
    /**
     * http transport handler.
     * @param req http request input.
     * @param context request with context for interceptor
     */
    abstract handle(req: HttpRequest): Observable<HttpEvent>;
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

