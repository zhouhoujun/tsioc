import { Abstract, Inject, InvocationContext, isPromise, Providers } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { catchError, finalize, Observable, Subscription, EMPTY, isObservable, connectable, Subject, from, of } from 'rxjs';
import { OnDispose } from '../../lifecycle';
import { Server } from '../../server';
import { TransportEvent, TransportRequest, TransportResponse, ReadPacket, WritePacket } from '../packet';
import { Deserializer, EmptyDeserializer } from '../deserializer';
import { EmptySerializer, Serializer } from '../serializer';
import { Pattern, stringify } from '../pattern';


@Abstract()
@Providers([
    { provide: Serializer, useClass: EmptySerializer },
    { provide: Deserializer, useClass: EmptyDeserializer }
])
export abstract class AbstractServer implements Server, OnDispose {

    @Logger() protected readonly logger!: ILogger;

    @Inject() protected serializer!: Serializer<TransportResponse>;
    @Inject() protected deserializer!: Deserializer<TransportRequest | TransportEvent>;

    protected readonly handlers = new Map<string, MessageHandler>();

    abstract startup(): Promise<void>;

    abstract onDispose(): Promise<void>;


    public addHandler(
        pattern: any,
        callback: MessageHandler,
        isEventHandler = false,
    ) {
        const normalizedPattern = this.normalizePattern(pattern);
        callback.isEventHandler = isEventHandler;

        if (this.handlers.has(normalizedPattern) && isEventHandler) {
            const headRef = this.handlers.get(normalizedPattern)!;
            const tailRef = tail(headRef);
            tailRef.next = callback;
        } else {
            this.handlers.set(normalizedPattern, callback);
        }
    }

    public getHandlers(): Map<string, MessageHandler> {
        return this.handlers;
    }

    public getHandlerByPattern(pattern: string): MessageHandler | undefined {
        const route = this.getRouteFromPattern(pattern);
        return this.handlers.get(route)
    }

    public send(
        stream: Observable<any>,
        respond: (data: WritePacket) => unknown | Promise<unknown>,
    ): Subscription {
        let dataBuffer: WritePacket[];
        const scheduleOnNextTick = (data: WritePacket) => {
            if (!dataBuffer) {
                dataBuffer = [data];
                process.nextTick(async () => {
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
        pattern: string,
        packet: ReadPacket,
        context: InvocationContext,
    ): Promise<any> {
        const handler = this.getHandlerByPattern(pattern);
        if (!handler) {
            return this.logger.error(`There is no matching event handler defined in the remote service. Event pattern: ${JSON.stringify(pattern)}.`);
        }
        const resultOrStream = await handler(packet.data, context);
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

    protected getRouteFromPattern(pattern: string): string {
        let validPattern: Pattern;

        try {
            validPattern = JSON.parse(pattern);
        } catch (error) {
            // Uses a fundamental object (`pattern` variable without any conversion)
            validPattern = pattern;
        }
        return this.normalizePattern(validPattern);
    }

    protected normalizePattern(pattern: Pattern): string {
        return stringify(pattern);
    }

}


function tail(handler: MessageHandler): MessageHandler {
    return handler?.next ? tail(handler.next) : handler;
}

export interface MessageHandler<TInput = any, TContext = any, TResult = any> {
    (data: TInput, ctx?: TContext): Promise<Observable<TResult>>;
    next?: (data: TInput, ctx?: TContext) => Promise<Observable<TResult>>;
    isEventHandler?: boolean;
}