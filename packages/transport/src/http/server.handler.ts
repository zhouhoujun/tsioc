import { Abstract } from '@tsdi/ioc';
import { HttpEvent, HttpRequest, TransportHandler } from '@tsdi/core';
import { Observable } from 'rxjs';

/**
 * http server side handler.
 */
 @Abstract()
 export abstract class HttpServerHandler implements TransportHandler<HttpRequest, HttpEvent> {
     /**
      * http transport handler.
      * @param req http request input.
      */
      abstract handle(req: HttpRequest): Observable<HttpEvent>;
 }

 