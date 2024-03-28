import { Abstract, Injector } from '@tsdi/ioc';
import { TransportOpts, BaseTransportSession } from '@tsdi/common/transport';
import { Observable, Subject, Subscription, first, merge, mergeMap, takeUntil } from 'rxjs';
import { RequestHandler } from './RequestHandler';
import { RequestContext } from './RequestContext';

@Abstract()
export abstract class TransportSession<TSocket = any, TMsg = any> extends BaseTransportSession<TSocket, RequestContext, any, TMsg> {

    protected destroy$ = new Subject<void>;

    listen(handler: RequestHandler, destroy$?: Observable<any>): Subscription {
        return this.receive().pipe(
            takeUntil(destroy$ ? merge(this.destroy$, destroy$).pipe(first()): this.destroy$),
            mergeMap(request => handler.handle(request))
        ).subscribe()
    }

    override async destroy(): Promise<void> {
        this.destroy$.next();
        this.destroy$.complete();
    }

}

/**
 * transport session factory.
 */
@Abstract()
export abstract class TransportSessionFactory<TSocket = any, TMsg = any> {
    /**
     * create transport session.
     * @param options 
     */
    abstract create(injector: Injector, socket: TSocket, options: TransportOpts): TransportSession<TSocket, TMsg>;
}

