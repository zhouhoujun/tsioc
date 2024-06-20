import { Abstract, Injector } from '@tsdi/ioc';
import { ResponseEvent, AbstractRequest, Message, ResponseFactory } from '@tsdi/common';
import { TransportOpts, BaseTransportSession, TransportContext, Redirector } from '@tsdi/common/transport';
import { Observable, finalize, first, merge, mergeMap, takeUntil } from 'rxjs';


/**
 * transport session for client.
 */
@Abstract()
export abstract class ClientTransportSession<TSocket = any, TMsg extends Message = Message> extends BaseTransportSession<TSocket, AbstractRequest, ResponseEvent, TMsg> {

    /**
     * response factory.
     */
    abstract get responseFactory(): ResponseFactory;
    /**
     * redirector.
     */
    abstract get redirector(): Redirector | null;

    request(req: AbstractRequest, destroy$?: Observable<any>): Observable<ResponseEvent> {
        const context = new TransportContext(this);
        return this.send(req, context)
            .pipe(
                mergeMap(msg => this.receive(context.next(msg))),
                takeUntil(destroy$ ? merge(this.destroy$, destroy$).pipe(first()) : this.destroy$),
                finalize(() => context.onDestroy())
            )
    }
}

/**
 * client transport session factory.
 */
@Abstract()
export abstract class ClientTransportSessionFactory<TSocket = any, TOptions = TransportOpts, TMsg extends Message = Message> {
    /**
     * the options to create transport session.
     * @param options 
     */
    abstract create(injector: Injector, socket: TSocket, options: TOptions): ClientTransportSession<TSocket, TMsg>;
}
