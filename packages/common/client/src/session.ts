import { Abstract, Injector } from '@tsdi/ioc';
import { InputContext, TransportEvent, TransportRequest } from '@tsdi/common';
import { TransportOpts, TransportSession } from '@tsdi/common/transport';
import { Observable, Subject, finalize, first, merge, mergeMap, takeUntil } from 'rxjs';

@Abstract()
export abstract class ClientTransportSession<TSocket = any, TMsg = any> extends TransportSession<TSocket, TransportRequest, TransportEvent, TMsg> {

    protected destroy$ = new Subject<void>;

    request(req: TransportRequest, destroy$?: Observable<any>): Observable<TransportEvent> {
        const context = new InputContext();
        return this.send(req, context)
            .pipe(
                mergeMap(msg => this.receive(context.next(msg))),
                takeUntil(destroy$ ? merge(this.destroy$, destroy$).pipe(first()) : this.destroy$),
                finalize(() => context.onDestroy())
            )
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
export abstract class ClientTransportSessionFactory<TSocket = any, TMsg = any> {
    /**
     * create transport session.
     * @param options 
     */
    abstract create(injector: Injector, socket: TSocket, options: TransportOpts): ClientTransportSession<TSocket, TMsg>;
}
