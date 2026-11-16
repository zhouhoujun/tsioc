import { Injectable } from '@tsdi/ioc';
import { RequestContext, RequestHandler, RequestInterceptor } from '@tsdi/common';
import { Observable, finalize } from 'rxjs';
import { InFlightTracker } from '../InFlightTracker';

/**
 * Counts requests while they are being processed by the service handler.
 *
 * Registered by the graceful shutdown feature so `close()` can drain in-flight
 * work before transports are closed. It observes real subscriptions, so a
 * request is only counted while its response stream is active.
 *
 * @publicApi
 */
@Injectable()
export class InFlightInterceptor<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext>
    implements RequestInterceptor<TInput, TOutput, TContext> {

    constructor(private readonly tracker: InFlightTracker) { }

    intercept(input: TInput, next: RequestHandler<TInput, TOutput, TContext>, context: TContext): Observable<TOutput> {
        return new Observable<TOutput>(subscriber => {
            const release = this.tracker.enter();
            try {
                return next.handle(input, context)
                    .pipe(finalize(release))
                    .subscribe(subscriber);
            } catch (err) {
                // Synchronous handler failures must release the slot too.
                release();
                throw err;
            }
        });
    }
}
