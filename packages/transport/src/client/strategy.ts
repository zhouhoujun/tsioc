import { ClientContext, IncomingMsg, InterceptorType, ListenOpts, TransportRequest, TransportStrategy } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Writable, Readable } from 'stream';
import { Observable } from 'rxjs';


@Abstract()
export abstract class ClientTransportStrategy extends TransportStrategy {
    /**
     * use interceptors.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    abstract use(interceptor: InterceptorType<Writable, Readable>, order?: number): this;
    abstract send(req: TransportRequest, context: ClientContext): Observable<any>;
}
