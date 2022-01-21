import { Abstract, Inject, Injectable, InvocationContext, InvocationOption, isFunction, isNil } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { Observable, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { Client } from '../../client';
import { OnDispose } from '../../lifecycle';
import { InvalidMessageError } from '../error';
import { Pattern, Protocol } from '../packet';
import { TransportContextFactory, TransportOption } from '../context';
import { TransportHandler } from '../handler';


/**
 * abstract clinent.
 */
@Abstract()
export abstract class TransportClient implements Client, OnDispose {
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
     * @param pattern message pattern.
     * @param body send data.
     */
    abstract send<TResult = any, TInput = any>(pattern: Pattern, body: TInput, options?: InvocationOption): Observable<TResult>;
    /**
     * emit message
     * @param pattern event pattern.
     * @param body event data.
     */
    abstract emit<TResult = any, TInput = any>(pattern: Pattern, body: TInput, options?: InvocationOption): Observable<TResult>;
    /**
     * request with option.
     * @param option 
     */
    abstract request<TResult = any>(option: TransportOption): Observable<TResult>;
    /**
     * on dispose.
     */
    abstract onDispose(): Promise<void>
}


@Injectable()
export class DefaultTransportClient extends TransportClient {

    @Logger()
    protected readonly logger!: ILogger;
    @Inject()
    protected context!: InvocationContext;

    constructor(readonly handler: TransportHandler, readonly protocol: Protocol) {
        super();
    }

    async onDispose(): Promise<void> {
        if (isFunction((this.handler as TransportHandler & OnDispose).onDispose)) {
            await (this.handler as TransportHandler & OnDispose).onDispose();
        }
        await this.context.onDestroy();
    }

    send<TResult = any, TInput = any>(pattern: Pattern, body: TInput, options?: InvocationOption): Observable<TResult> {
        return this.request({ ...options, pattern, body })
    }

    emit<TResult = any, TInput = any>(pattern: Pattern, body: TInput, options?: InvocationOption): Observable<TResult> {
        return this.request({ ...options, pattern, body, event: true })
    }

    request<TResult = any>(option: TransportOption): Observable<TResult> {
        if (isNil(option.pattern) || isNil(option.body)) {
            return throwError(() => new InvalidMessageError());
        }
        const ctx = this.createContext(option);
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

    protected createContext(option: TransportOption) {
        return this.context.resolve(TransportContextFactory)?.create(this.context, { ...option, parent: this.context, protocol: this.protocol })!;
    }

}
