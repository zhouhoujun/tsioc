import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { TransportBackend, TransportHandler } from '../handler';
import { HttpRequest } from './request';
import { HttpResponse } from './response';

/**
 * http handler.
 */
@Abstract()
export abstract class HttpHandler implements TransportHandler {
    /**
     * http transport handler.
     * @param req http request input.
     */
     abstract handle(req: HttpRequest): Observable<HttpResponse>;
}

/**
 * http backend.
 */
@Abstract()
export abstract class HttpBackend implements TransportBackend {
    /**
     * http transport handler.
     * @param req http request input.
     */
     abstract handle(req: HttpRequest): Observable<HttpResponse>;
}
