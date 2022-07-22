import { EndpointBackend, EndpointContext } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { TransportRequest } from './request';
import { TransportEvent } from './response';


/**
 * transport protocol backend.
 */
@Abstract()
export abstract class ProtocolBackend implements EndpointBackend<TransportRequest, TransportEvent> {
    abstract handle(req: TransportRequest, context: EndpointContext): Observable<TransportEvent>;
}

