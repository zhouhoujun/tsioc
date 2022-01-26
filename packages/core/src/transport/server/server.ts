import { Abstract, isFunction, isPromise } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { catchError, finalize, Observable, Subscription, EMPTY, isObservable, connectable, Subject, from, of } from 'rxjs';
import { OnDispose } from '../../lifecycle';
import { Server } from '../../server';
import { WritePacket } from '../packet';
import { TransportContext } from '../context';
import { TransportRouter } from './router';


@Abstract()
export abstract class TransportServer implements Server, OnDispose {

    @Logger()
    protected readonly logger!: ILogger;


    constructor(readonly router: TransportRouter) {

    }

    abstract startup(): Promise<void>;

    async onDispose(): Promise<void> {
        if (isFunction((this.router as TransportRouter & OnDispose).onDispose)) {
            await (this.router as TransportRouter & OnDispose).onDispose();
        }
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
        context: TransportContext,
    ): Promise<any> {
        const handler = this.router.getHandlerByPattern(context.pattern);
        if (!handler) {
            return this.logger.error(`There is no matching event handler defined in the remote service. Event pattern: ${JSON.stringify(context.pattern)}.`);
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
