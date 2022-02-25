import { Abstract } from '@tsdi/ioc';
import { TransportBackend, TransportHandler } from '../handler';

@Abstract()
export abstract class HttpHandler implements TransportHandler {
    /**
     * transport handler.
     * @param req request input.
     */
     abstract handle(req: TRequest): Observable<TResponse>;
}

@Abstract()
export abstract class HttpBackend implements TransportBackend {
    /**
     * transport handler.
     * @param req request input.
     */
     abstract handle(req: TRequest): Observable<TResponse>;

}