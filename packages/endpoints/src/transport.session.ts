import { Abstract, Injector } from '@tsdi/ioc';
import { Message } from '@tsdi/common';
import { BaseTransportSession, FileAdapter, MimeAdapter, OutgoingFactory } from '@tsdi/common/transport';
import { Observable, Subscription, first, merge, mergeMap, takeUntil } from 'rxjs';
import { RequestHandler } from './RequestHandler';
import { RequestContext, RequestContextFactory } from './RequestContext';
import { ServerOpts } from './Server';
import { AcceptsPriority } from './accepts';

@Abstract()
export abstract class TransportSession<TSocket = any, TMsg extends Message = Message, TOptions extends ServerOpts = ServerOpts> extends BaseTransportSession<TSocket, RequestContext, RequestContext, TMsg> {
    /**
     * server options.
     */
    abstract get serverOptions(): TOptions;
    /**
     * outgoing message factory.
     */
    abstract get outgoingFactory(): OutgoingFactory | null;
    /**
     * request context factory.
     */
    abstract get requestContextFactory(): RequestContextFactory;
    /**
     * mime adapter.
     */
    abstract get mimeAdapter(): MimeAdapter | null;
    /**
     * accepts
     */
    abstract get acceptsPriority(): AcceptsPriority | null;
    /**
     * file adapter.
     */
    abstract get fileAdapter(): FileAdapter;

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


