import { Abstract, Injector } from '@tsdi/ioc';
import { AbstractTransport, FileAdapter, Incoming, IncomingFactory, MimeAdapter, OutgoingFactory, Transfer, TransportContext } from '@tsdi/common/transport';
import { Observable, Subscription, first, merge, mergeMap, takeUntil } from 'rxjs';
import { AbstractRequestHandler } from './AbstractRequestHandler';
import { RequestContext } from './RequestContext';
import { ServerOpts } from './server.options';
import { AcceptsPriority } from './accepts';

@Abstract()
export abstract class ServerTransport<TSocket = any, TContext extends RequestContext = RequestContext, TOptions extends ServerOpts = ServerOpts> extends AbstractTransport<TSocket, Incoming, TContext> {

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

    get protocol(): string {
        return this.serverOptions.protocol ?? '';
    }

    protected override initSendContext(context: TransportContext, outgoing: TContext): void {
        context.set(RequestContext, outgoing);
    }
    /**
     * handle message.
     */
    handle(handler: AbstractRequestHandler, destroy$?: Observable<any>): Subscription {
        const context = TransportContext.create(this);
        return this.receive(context).pipe(
            takeUntil(destroy$ ? merge(this.destroy$, destroy$).pipe(first()) : this.destroy$),
            mergeMap(incoming => this.transfer.transform(incoming, context)),
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

