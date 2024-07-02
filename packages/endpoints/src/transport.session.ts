import { Abstract, Injector } from '@tsdi/ioc';
import { Message } from '@tsdi/common';
import { BaseTransportSession, OutgoingFactory } from '@tsdi/common/transport';
import { Observable, Subscription, first, merge, mergeMap, takeUntil } from 'rxjs';
import { RequestHandler } from './RequestHandler';
import { RequestContext, RequestContextFactory } from './RequestContext';
import { ServerOpts } from './Server';

@Abstract()
export abstract class TransportSession<TSocket = any, TMsg extends Message = Message, TOptions extends ServerOpts = ServerOpts> extends BaseTransportSession<TSocket, RequestContext, any, TMsg> {
    /**
     * server options.
     */
    abstract get serverOptions(): TOptions;
    /**
     * request context factory.
     */
    abstract get requestContextFactory(): RequestContextFactory;
    /**
     * outgoing message factory.
     */
    abstract get outgoingFactory(): OutgoingFactory;

    listen(handler: RequestHandler, destroy$?: Observable<any>): Subscription {
        return this.receive().pipe(
            takeUntil(destroy$ ? merge(this.destroy$, destroy$).pipe(first()) : this.destroy$),
            mergeMap(request => handler.handle(request))
        ).subscribe()
    }

}

/**
 * transport session factory.
 */
@Abstract()
export abstract class TransportSessionFactory<TSocket = any, TMsg extends Message = Message> {
    /**
     * create transport session.
     * @param options 
     */
    abstract create(injector: Injector, socket: TSocket, options: ServerOpts): TransportSession<TSocket, TMsg>;
}


