import { Abstract, Injector } from '@tsdi/ioc';
import { TransportEvent, TransportRequest } from '@tsdi/common';
import { TransportOpts, BaseTransportSession, InputContext } from '@tsdi/common/transport';
import { Observable, Subject, finalize, first, merge, mergeMap, takeUntil } from 'rxjs';

/**
 * transport session for client.
 */
@Abstract()
export abstract class ClientTransportSession<TSocket = any, TMsg = any> extends BaseTransportSession<TSocket, TransportRequest, TransportEvent, TMsg> {

    protected destroy$ = new Subject<void>;

    request(req: TransportRequest, destroy$?: Observable<any>): Observable<TransportEvent> {
        const context = new InputContext(this.codingsType);
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
 * client transport session factory.
 */
@Abstract()
export abstract class ClientTransportSessionFactory<TSocket = any, TMsg = any> {
    /**
     * create transport session.
     * @param options 
     */
    abstract create(injector: Injector, socket: TSocket, options: TransportOpts): ClientTransportSession<TSocket, TMsg>;
}
