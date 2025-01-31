import { Abstract, Injector } from '@tsdi/ioc';
import { AbstractTransport, FileAdapter, Incoming, IncomingFactory, MimeAdapter, OutgoingFactory, Transfer, TransportContext } from '@tsdi/common/transport';
import { Observable, Subscription, first, merge, mergeMap, takeUntil } from 'rxjs';
import { AbstractRequestHandler } from './AbstractRequestHandler';
import { RequestContext } from './RequestContext';
import { ServerOpts } from './Server';
import { AcceptsPriority } from './accepts';

@Abstract()
export abstract class ServerTransport<TSocket = any, TOptions extends ServerOpts = ServerOpts> extends AbstractTransport<TSocket, Incoming, RequestContext> {
    
    readonly client = false;
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
     * incoming transfer
     */
    abstract get transfer(): Transfer<Incoming, RequestContext<any>>;
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

    get options() {
        if (!this.serverOptions.transportOptions) {
            this.serverOptions.transportOptions = {};
        }
        return this.serverOptions.transportOptions
    }


    listen(handler: AbstractRequestHandler, destroy$?: Observable<any>): Subscription {
        return this.receive().pipe(
            takeUntil(destroy$ ? merge(this.destroy$, destroy$).pipe(first()) : this.destroy$),
            mergeMap(incoming => this.transfer.transform(incoming, new TransportContext(this, incoming))),
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

