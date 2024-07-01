import { AbstractRequest, Message, ResponseEvent, ResponseFactory } from '@tsdi/common';
import { BaseTransportSession, Redirector, TransportOpts } from '@tsdi/common/transport';
import { Abstract, Injector } from '@tsdi/ioc';
import { Observable, first, merge, mergeMap, takeUntil } from 'rxjs';


/**
 * transport session for client.
 */
@Abstract()
export abstract class ClientTransportSession<TSocket = any, TMsg extends Message = Message> extends BaseTransportSession<TSocket, AbstractRequest<any>, ResponseEvent<any>, TMsg> {

    /**
     * response factory.
     */
    abstract get responseFactory(): ResponseFactory;
    /**
     * redirector.
     */
    abstract get redirector(): Redirector | null;

    request(req: AbstractRequest<any>, destroy$?: Observable<any>): Observable<ResponseEvent<any>> {
        return this.send(req)
            .pipe(
                mergeMap(() => this.receive(req)),
                takeUntil(destroy$ ? merge(this.destroy$, destroy$).pipe(first()) : this.destroy$)
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
