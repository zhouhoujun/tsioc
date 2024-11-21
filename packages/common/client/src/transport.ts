import { Abstract, Injector } from '@tsdi/ioc';
import { AbstractRequest, ResponseEvent, ResponseFactory } from '@tsdi/common';
import { AbstractTransport, IEventEmitter, Redirector } from '@tsdi/common/transport';
import { Observable, first, merge, mergeMap, takeUntil } from 'rxjs';
import { ClientOpts } from './options';


/**
 * transport for client.
 */
@Abstract()
export abstract class ClientTransport<TSocket = any> extends AbstractTransport<TSocket, AbstractRequest<any>, ResponseEvent<any>> {
    /**
     * client options
     */
    abstract get clientOptions(): ClientOpts;
    // /**
    //  * client incoming message factory.
    //  */
    // abstract get incomingFactory(): ClientIncomingFactory;
    /**
     * response factory.
     */
    abstract get responseFactory(): ResponseFactory;
    /**
     * redirector.
     */
    abstract get redirector(): Redirector | null;

    request(req: AbstractRequest<any>, destroy$?: Observable<any>, channel?: IEventEmitter): Observable<ResponseEvent<any>> {
        return this.send(req, channel)
            .pipe(
                mergeMap((chl) => this.receive(chl ?? channel, req)),
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
