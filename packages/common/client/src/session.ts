import { Abstract, Injector } from '@tsdi/ioc';
import { ResponseEvent, AbstractRequest } from '@tsdi/common';
import { TransportOpts, BaseTransportSession, TransportContext } from '@tsdi/common/transport';
import { Observable, finalize, first, merge, mergeMap, takeUntil } from 'rxjs';
import { CodingType } from '@tsdi/common/codings';


/**
 * transport session for client.
 */
@Abstract()
export abstract class ClientTransportSession<TSocket = any, TMsg = any> extends BaseTransportSession<TSocket, AbstractRequest, ResponseEvent, TMsg> {

    request(req: AbstractRequest, destroy$?: Observable<any>): Observable<ResponseEvent> {
        const context = new TransportContext(this);
        return this.send(req, context.next(req, CodingType.Encode))
            .pipe(
                mergeMap(msg => this.receive(context.next(msg, CodingType.Decode))),
                takeUntil(destroy$ ? merge(this.destroy$, destroy$).pipe(first()) : this.destroy$),
                finalize(() => context.onDestroy())
            )
    }
}

/**
 * client transport session factory.
 */
@Abstract()
export abstract class ClientTransportSessionFactory<TSocket = any, TOptions = TransportOpts, TMsg = any> {
    /**
     * the options to create transport session.
     * @param options 
     */
    abstract create(injector: Injector, socket: TSocket, options: TOptions): ClientTransportSession<TSocket, TMsg>;
}
