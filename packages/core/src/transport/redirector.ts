import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { EndpointContext } from './context';
import { ResHeaders } from './headers';
import { RestfulPacket } from './packet';

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
    abstract redirect<T>(ctx: EndpointContext, req: RestfulPacket, status: number, headers: ResHeaders): Observable<T>;
}
