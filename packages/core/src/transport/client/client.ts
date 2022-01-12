import { Abstract, Inject, InvocationContext, InvocationOption, isNil, Providers } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { connectable, defer, Observable, Observer, Subject, throwError } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { Client } from '../../client';
import { OnDispose } from '../../lifecycle';
import { InvalidMessageError } from '../error';
import { ReadPacket, WritePacket } from '../packet';
import { Pattern, stringify } from '../pattern';
import { TransportBackend, TransportContext, TransportHandler } from '../handler';
import { TransportType } from '../types';


export interface RequestOption extends InvocationOption {
    event?: boolean;
}

/**
 * abstract clinent.
 */
@Abstract()
export abstract class AbstractClient implements Client, OnDispose {

    @Logger()
    protected readonly logger!: ILogger;
    @Inject()
    protected context!: InvocationContext;

    constructor(protected handler: TransportHandler, readonly transport: TransportType) {

    }

    async onDispose(): Promise<void> {
        await (this.handler as TransportHandler & OnDispose).onDispose?.()
        await this.context.onDestroy();
    }

    send<TResult = any, TInput = any>(pattern: Pattern, data: TInput): Observable<TResult> {
        if (isNil(pattern) || isNil(data)) {
            return throwError(() => new InvalidMessageError());
        }
        const ctx = this.createContext({ pattern, data });
        return this.handler.handle(ctx)
            .pipe(
                mergeMap(async r => {
                    await ctx.destroy();
                    return r;
                }),
                catchError(async err => {
                    await ctx.destroy();
                    return err;
                })
            );
    }

    emit<TResult = any, TInput = any>(pattern: Pattern, data: TInput): Observable<TResult> {
        if (isNil(pattern) || isNil(data)) {
            return throwError(() => new InvalidMessageError());
        }
        const ctx = this.createContext({ pattern, data, event: true } as any);
        return this.handler.handle(ctx)
            .pipe(
                mergeMap(async r => {
                    await ctx.destroy();
                    return r;
                }),
                catchError(async err => {
                    await ctx.destroy();
                    return err;
                })
            );

    }

    request<TResult = any, TInput = any>(pattern: Pattern, data: TInput, option?: RequestOption): Observable<TResult> {
        if (isNil(pattern) || isNil(data)) {
            return throwError(() => new InvalidMessageError());
        }
        const ctx = this.createContext({ pattern, data, event: option?.event }, option);
        return this.handler.handle(ctx)
            .pipe(
                mergeMap(async r => {
                    await ctx.destroy();
                    return r;
                }),
                catchError(async err => {
                    await ctx.destroy();
                    return err;
                })
            );

    }

    protected createContext<T>(input: ReadPacket<T>, option?: InvocationOption) {
        return TransportContext.create(this.context.injector, { ...option, parent: this.context, request: input, transport: this.transport });
    }

}

@Abstract()
export abstract class ClientTransportBackend<TInput extends ReadPacket = ReadPacket, TOutput extends WritePacket = WritePacket>
    extends TransportBackend<TInput, TOutput>  {

    constructor(private context: InvocationContext) {
        super();
    }

    abstract connect(): Promise<any>;

    handle(ctx: TransportContext<TInput>): Observable<TOutput> {
        if (ctx.request.event) {
            const source = defer(async () => this.connect()).pipe(
                mergeMap(() => this.dispatchEvent(ctx.request)),
            );
            const connectableSource = connectable(source, {
                connector: () => new Subject(),
                resetOnDisconnect: false,
            });
            connectableSource.connect();
            return connectableSource;
        } else {
            return defer(async () => this.connect()).pipe(
                mergeMap(
                    () => new Observable<TOutput>((observer) => {
                        const callback = this.createObserver(observer);
                        return this.publish(ctx.request, callback);
                    })
                ));
        }
    }

    protected createObserver<T>(
        observer: Observer<T>,
    ): (packet: TOutput) => void {
        return ({ err, response, disposed }: TOutput) => {
            if (err) {
                return observer.error(this.serializeError(err));
            } else if (response !== undefined && disposed) {
                observer.next(this.serializeResponse(response));
                return observer.complete();
            } else if (disposed) {
                return observer.complete();
            }
            observer.next(this.serializeResponse(response));
        };
    }

    /**
     * publish handle.
     * @param packet 
     * @param callback 
     */
    protected abstract publish(
        packet: TInput,
        callback: (packet: TOutput) => void,
    ): () => void;

    /**
     * dispatch event.
     * @param packet 
     */
    protected abstract dispatchEvent<T = any>(packet: TInput): Promise<T>;

    protected normalizePattern(pattern: Pattern): string {
        return stringify(pattern);
    }

    protected serializeError(err: any): any {
        return err;
    }

    protected serializeResponse(response: any): any {
        return response;
    }
}
