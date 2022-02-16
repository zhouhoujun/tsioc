import { Abstract, Injectable, isFunction } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { catchError, finalize, Observable, Subscription, EMPTY, isObservable, connectable, Subject } from 'rxjs';
import { OnDispose } from '../../lifecycle';
import { Protocol, ReadPacket, WritePacket } from '../packet';
import { TransportHandler } from '../handler';


/**
 * abstract transport server.
 */
@Abstract()
export abstract class TransportServer implements OnDispose {
    /**
     * transport protocol type.
     */
    abstract get protocol(): Protocol;
    /**
     * transport handler.
     */
    abstract get handler(): TransportHandler;
    /**
     * send message.
     * @param stream send stream. 
     * @param respond respond.
     */
    abstract send(stream: Observable<any>, respond: (data: WritePacket) => void | Promise<void>): Subscription;
    /**
     * handle event.
     * @param packet 
     */
    abstract handleEvent(packet: ReadPacket): Promise<any>;
    /**
     * on dispose.
     */
    abstract onDispose(): Promise<void>;

}


/**
 * transport server.
 */
@Injectable()
export class DefaultTransportServer extends TransportServer implements OnDispose {

    @Logger()
    protected readonly logger!: ILogger;


    constructor(readonly handler: TransportHandler, readonly protocol: Protocol) {
        super();
    }

    public send(
        stream: Observable<any>,
        respond: (data: WritePacket) => unknown | Promise<unknown>,
    ): Subscription {
        let dataBuffer: WritePacket[];
        const scheduleOnNextTick = (data: WritePacket) => {
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
                    scheduleOnNextTick({ error });
                    return EMPTY;
                }),
                finalize(() => scheduleOnNextTick({ disposed: true })),
            )
            .subscribe((body: any) => scheduleOnNextTick({ body }));
    }

    public async handleEvent(
        packet: ReadPacket
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

    async onDispose(): Promise<void> {
        if (isFunction((this.handler as TransportHandler & OnDispose).onDispose)) {
            await (this.handler as TransportHandler & OnDispose).onDispose();
        }
    }


}
