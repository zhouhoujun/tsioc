import { Handler, Interceptor, TransportEvent, TransportRequest } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { Observable } from 'rxjs';

@Injectable()
export class TcpPathInterceptor implements Interceptor<TransportRequest, TransportEvent> {
    intercept(input: TransportRequest<any>, next: Handler<TransportRequest<any>, TransportEvent>): Observable<TransportEvent> {
        throw new Error('Method not implemented.');
    }

}
