import { Incoming, ReadableLike, RequestContext, RequestHandler, RequestInterceptor } from '@tsdi/common';
import { Observable } from 'rxjs';
import { SessionOptions } from '../sessions/Session';
/**
 * session.
 */
export declare class SessionInterceptor implements RequestInterceptor<ReadableLike<Incoming>> {
    private options;
    constructor(options?: SessionOptions);
    intercept(input: ReadableLike<Incoming>, next: RequestHandler<ReadableLike<Incoming>, any>, context: RequestContext): Observable<any>;
}
