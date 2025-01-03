import { Abstract, Injector } from '@tsdi/ioc';
import { HeaderAdapter } from '@tsdi/common';
import { AbstractTransport, Deserializer, FileAdapter, IncomingFactory, MimeAdapter, OutgoingFactory, Serializer, StatusAdapter, StreamAdapter } from '@tsdi/common/transport';
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



export abstract class DefaultServerTransport extends ServerTransport<any> {

    constructor(
        readonly socket: any,
        readonly protocol: string,
        readonly serializer: Serializer,
        readonly deserializer: Deserializer,       
        readonly headerAdapter: HeaderAdapter,
        readonly streamAdapter: StreamAdapter,
        readonly fileAdapter: FileAdapter,
        readonly incomingFactory: IncomingFactory,
        readonly outgoingFactory: OutgoingFactory,
        readonly requestContextFactory: RequestContextFactory,
        readonly statusAdapter: StatusAdapter | null,
        readonly mimeAdapter: MimeAdapter | null,
        readonly acceptsPriority: AcceptsPriority | null,
        readonly serverOptions: ServerOpts,
    ) {
        super()
    }

}
