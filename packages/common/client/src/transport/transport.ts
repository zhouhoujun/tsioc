import { Abstract, Injector } from '@tsdi/ioc';
import { AbstractRequest, PatternFormatter, ResponseEvent, ResponseFactory } from '@tsdi/common';
import { AbstractTransport, ClientIncoming, ClientIncomingFactory, Redirector, Transfer, TransportContext } from '@tsdi/common/transport';
import { Observable, first, merge, mergeMap, takeUntil } from 'rxjs';
import { ClientOpts } from '../options';


/**
 * transport for client.
 */
@Abstract()
export abstract class ClientTransport<
    TSocket = any,
    TRequest extends AbstractRequest<any> = AbstractRequest<any>,
    TMsg = any,
    TOptions extends ClientOpts = ClientOpts> extends AbstractTransport<TSocket, ClientIncoming, TRequest, TMsg> {

    readonly client = true;
    /**
     * client options
     */
    abstract get clientOptions(): TOptions;
    /**
     * client incoming message factory.
     */
    abstract get incomingFactory(): ClientIncomingFactory;
    /**
     * response factory.
     */
    abstract get responseFactory(): ResponseFactory;
    /**
     * pattern formatter.
     */
    abstract get patternFormatter(): PatternFormatter | null;
    /**
     * incoming transfer
     */
    abstract get transfer(): Transfer<ClientIncoming, ResponseEvent<any>>;
    /**
     * redirector.
     */
    abstract get redirector(): Redirector | null;

    get options() {
        if (!this.clientOptions.transportOptions) {
            this.clientOptions.transportOptions = {};
        }
        return this.clientOptions.transportOptions
    }

    get protocol(): string {
        return this.clientOptions.protocol ?? '';
    }

    protected override initSendContext(context: TransportContext, data: TRequest): void {
        context.set(AbstractRequest, data);
    }

    request(req: TRequest, destroy$?: Observable<any>, context?: TransportContext): Observable<ResponseEvent<any>> {
        if (!context) {
            context = TransportContext.create(this)
        }
        return this.send(req, context)
            .pipe(
                mergeMap((chl) => this.receive(context!)),
                mergeMap(incoming => this.transfer.transform(incoming, context!)),
                takeUntil(destroy$ ? merge(this.destroy$, destroy$).pipe(first()) : this.destroy$)
            )
    }
}

/**
 * client transport session factory.
 */
@Abstract()
export abstract class ClientTransportFactory<TSocket = any, TOptions = ClientOpts> {
    /**
     * the options to create transport session.
     * @param options 
     */
    abstract create(injector: Injector, socket: TSocket, options: TOptions): ClientTransport<TSocket>;
}

