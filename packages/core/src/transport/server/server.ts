import { Abstract, Inject, isPromise, Providers } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { catchError, finalize, Observable, Subscription, EMPTY, isObservable, connectable, Subject, from, of } from 'rxjs';
import { OnDispose } from '../../lifecycle';
import { Server } from '../../server';
import { TransportEvent, TransportRequest, TransportResponse, ReadPacket, WritePacket } from '../packet';
import { Deserializer } from '../deserializer';
import { Serializer } from '../serializer';
import { TransportContext } from '../handler';
import { TransportHandlers } from '../handlers';


@Abstract()
export abstract class TransportServer implements Server, OnDispose {

    @Logger()
    protected readonly logger!: ILogger;

    @Inject()
    protected serializer!: Serializer<TransportResponse>;
    @Inject()
    protected deserializer!: Deserializer<TransportRequest | TransportEvent>;

    constructor(readonly handlers: TransportHandlers) {

    }

    abstract startup(): Promise<void>;

    abstract onDispose(): Promise<void>;


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
                catchError((err: any) => {
                    scheduleOnNextTick({ err });
                    return EMPTY;
                }),
                finalize(() => scheduleOnNextTick({ disposed: true })),
            )
            .subscribe((response: any) => scheduleOnNextTick({ response }));
    }

    public async handleEvent(
        context: TransportContext<ReadPacket>,
    ): Promise<any> {
        const handler = this.handlers.getHandlerByPattern(context.arguments.pattern);
        if (!handler) {
            return this.logger.error(`There is no matching event handler defined in the remote service. Event pattern: ${JSON.stringify(context.arguments.pattern)}.`);
        }
        const resultOrStream = await handler.handle(context);
        if (isObservable(resultOrStream)) {
            const connectableSource = connectable(resultOrStream, {
                connector: () => new Subject(),
                resetOnDisconnect: false,
            });
            connectableSource.connect();
        }
    }

    protected toObservable<T>(value: T | Promise<T> | Observable<T>): Observable<T> {
        if (isPromise(value)) {
            return from(value);
        } else if (isObservable(value)) {
            return value;
        }
        return of(value);
    }

}
