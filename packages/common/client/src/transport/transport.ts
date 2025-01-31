import { Abstract, Injector } from '@tsdi/ioc';
import { AbstractRequest, PatternFormatter, ResponseEvent, ResponseFactory } from '@tsdi/common';
import { AbstractTransport, ClientIncoming, ClientIncomingFactory, IEventEmitter, Redirector, Transfer, TransportContext } from '@tsdi/common/transport';
import { Observable, first, merge, mergeMap, takeUntil } from 'rxjs';
import { ClientOpts } from '../options';


/**
 * transport for client.
 */
@Abstract()
export abstract class ClientTransport<TSocket = any, TOptions extends ClientOpts = ClientOpts> extends AbstractTransport<TSocket, ClientIncoming, AbstractRequest<any>> {
    
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

    request(req: AbstractRequest<any>, destroy$?: Observable<any>, channel?: IEventEmitter): Observable<ResponseEvent<any>> {
        return this.send(req, channel)
            .pipe(
                mergeMap((chl) => this.receive(chl ?? channel, req)),
                mergeMap(incoming => this.transfer.transform(incoming, new TransportContext(this, req))),
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

