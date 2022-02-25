import { Abstract } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { catchError, finalize, Observable, Subscription, EMPTY, isObservable, connectable, Subject } from 'rxjs';
import { OnDispose } from '../lifecycle';
import { Protocol, TransportRequest, TransportResponse } from './packet';
import { TransportHandler } from './handler';


/**
 * abstract transport server.
 */
@Abstract()
export abstract class TransportServer<TRequest extends TransportRequest = TransportRequest, TResponse extends TransportResponse = TransportResponse> implements OnDispose {

    @Logger()
    protected readonly logger!: ILogger;
    /**
     * transport handler.
     */
    abstract get handler(): TransportHandler<TRequest, TResponse>;
    /**
     * send message.
     * @param stream send stream. 
     * @param respond respond.
     */
    public send(
        stream: Observable<any>,
        respond: (data: TResponse) => unknown | Promise<unknown>,
    ): Subscription {
        let dataBuffer: TResponse[];
        const scheduleOnNextTick = (data: TResponse) => {
            if (!dataBuffer) {
                dataBuffer = [data];
                (typeof process === 'undefined' ? setTimeout : process.nextTick)(async () => {
                    for (const item of dataBuffer) {
                        await respond(item);
                    }
                    dataBuffer = null!;
                });
            } else if (!data.disposed) {
                dataBuffer = dataBuffer.concat(data);
            } else {
                dataBuffer[dataBuffer.length - 1].disposed = data.disposed;
            }
        };
        return stream
            .pipe(
                catchError((error: any) => {
                    scheduleOnNextTick({ error } as TResponse);
                    return EMPTY;
                }),
                finalize(() => scheduleOnNextTick({ disposed: true } as TResponse )),
            )
            .subscribe((body: any) => scheduleOnNextTick({ body } as TResponse));
    }

    /**
     * handle event.
     * @param packet 
     */
    public async handleEvent(
        packet: TRequest
    ): Promise<any> {
        const resultOrStream = this.handler.handle(packet);
        if (isObservable(resultOrStream)) {
            const connectableSource = connectable(resultOrStream, {
                connector: () => new Subject(),
                resetOnDisconnect: false,
            });
            connectableSource.connect();
        }
    }

    /**
     * close server.
     */
    abstract close(): Promise<void>;

    /**
     * on dispose.
     */
    async onDispose(): Promise<void> {
        await this.close();
    }

}

/**
 * server option.
 */
 export interface ServerOption extends Record<string, any> {
    url?: string;
    host?: string;
    port?: number;
    /**
     * transport protocol type.
     */
    protocol: Protocol;
}

/**
 * server abstract factory.
 */
@Abstract()
export abstract class ServerFactory {
    /**
     * create by options.
     * @param options 
     */
    abstract create(options: ServerOption): TransportServer;
}
