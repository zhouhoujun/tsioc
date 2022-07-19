import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { EndpointContext } from './context';
import { TransportHeaders } from './headers';
import { RequestPacket } from './packet';

/**
 * transport client redirector.
 */
@Abstract()
export abstract class Redirector {
    /**
     * redirect to 
     * @param ctx client context.
     * @param req origin request.
     * @param status response status
     * @param headers response headers.
     */
    abstract redirect<T>(ctx: EndpointContext, req: RequestPacket, status: number, headers: TransportHeaders): Observable<T>;
}
