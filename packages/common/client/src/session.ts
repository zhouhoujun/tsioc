import { AbstractRequest, ResponseEvent, ResponseFactory } from '@tsdi/common';
import { BaseTransportSession, ClientIncomingFactory, IEventEmitter, Redirector } from '@tsdi/common/transport';
import { Abstract, Injector, isFunction, promisify } from '@tsdi/ioc';
import { Observable, first, merge, mergeMap, takeUntil } from 'rxjs';
import { ClientOpts } from './options';


/**
 * transport session for client.
 */
@Abstract()
export abstract class ClientTransportSession<TSocket = any> extends BaseTransportSession<TSocket, AbstractRequest<any>, ResponseEvent<any>> {
    /**
     * client options
     */
    abstract get clientOptions(): ClientOpts;
    /**
     * client incoming message factory.
     */
    abstract get incomingFactory(): ClientIncomingFactory;
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

    override async destroy(): Promise<void> {
        await super.destroy();
        await this.closeSocket();
    }

    protected async closeSocket() {
        const socket = this.socket as any;
        if (socket && isFunction(socket.close)) {
            await promisify(socket.close, socket)();
        }
    }
}

/**
 * client transport session factory.
 */
@Abstract()
export abstract class ClientTransportSessionFactory<TSocket = any, TOptions = ClientOpts> {
    /**
     * the options to create transport session.
     * @param options 
     */
    abstract create(injector: Injector, socket: TSocket, options: TOptions): ClientTransportSession<TSocket>;
}
