import { InterceptorType, TransportStrategy } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Writable, Readable } from 'stream';
import { Observable } from 'rxjs';
import { TransportContext } from './context';


@Abstract()
export abstract class ServerTransportStrategy extends TransportStrategy {
    /**
     * use interceptors.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    abstract use(interceptor: InterceptorType<Writable, Readable>, order?: number): this;
    abstract send(context: TransportContext): Observable<any>;
}