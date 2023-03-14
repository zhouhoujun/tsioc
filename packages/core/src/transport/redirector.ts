import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { EndpointContext } from '../filters/context';
import { ResHeaders } from './headers';
import { Message } from './packet';
import { RedirectStatus } from './status';

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
    abstract redirect<T>(ctx: EndpointContext, req: Message, status: RedirectStatus, headers: ResHeaders): Observable<T>;
}
