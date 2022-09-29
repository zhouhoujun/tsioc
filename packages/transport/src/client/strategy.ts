import { ClientContext, InterceptorType, TransportRequest, TransportStrategy } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Writable, Readable, Duplex } from 'stream';
import { Observable } from 'rxjs';
import { Connection, ConnectionOpts } from '../connection';
import { TransportClientOpts } from './options';


@Abstract()
export abstract class ClientTransportStrategy extends TransportStrategy {
    /**
     * use interceptors.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    abstract use(interceptor: InterceptorType<Writable, Readable>, order?: number): this;


    abstract createConnection(opts: TransportClientOpts): Connection;
    abstract send(req: TransportRequest, context: ClientContext): Observable<any>;
}
