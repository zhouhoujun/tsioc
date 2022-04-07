import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { HttpRequest } from './request';
import { HttpEvent } from './response';


/**
 * http handler.
 */
@Abstract()
export abstract class HttpHandler {
    /**
     * http transport handler.
     * @param req http request input.
     */
     abstract handle(req: HttpRequest): Observable<HttpEvent>;
}

/**
 * http backend.
 */
@Abstract()
export abstract class HttpBackend {
    /**
     * http transport handler.
     * @param req http request input.
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

