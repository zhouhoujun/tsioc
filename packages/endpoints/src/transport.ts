import { Abstract, Injector } from '@tsdi/ioc';
import { AbstractTransport, FileAdapter, IncomingFactory, MimeAdapter, OutgoingFactory } from '@tsdi/common/transport';
import { Observable, Subscription, first, merge, mergeMap, takeUntil } from 'rxjs';
import { AbstractRequestHandler } from './AbstractRequestHandler';
import { RequestContext, RequestContextFactory } from './RequestContext';
import { ServerOpts } from './Server';
import { AcceptsPriority } from './accepts';

@Abstract()
export abstract class ServerTransport<TSocket = any, TOptions extends ServerOpts = ServerOpts> extends AbstractTransport<TSocket, RequestContext, RequestContext> {
    /**
     * server options.
     */
    abstract get serverOptions(): TOptions;
    /**
     * server incoming message factory.
     */
    abstract get incomingFactory(): IncomingFactory;
    /**
     * outgoing message factory.
     */
    abstract get outgoingFactory(): OutgoingFactory;
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

    listen(handler: AbstractRequestHandler, destroy$?: Observable<any>): Subscription {
        return this.receive().pipe(
            takeUntil(destroy$ ? merge(this.destroy$, destroy$).pipe(first()) : this.destroy$),
            mergeMap(request => handler.handle(request))
        ).subscribe()
    }

}

/**
 * server transport factory.
 */
@Abstract()
export abstract class ServerTransportFactory<TSocket = any> {
    /**
     * create server transport.
     * @param options 
     */
    abstract create(injector: Injector, socket: TSocket, options: ServerOpts): ServerTransport<TSocket>;
}


