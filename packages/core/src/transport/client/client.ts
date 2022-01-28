import { Abstract, Inject, Injectable, InvocationContext, InvocationOption, isFunction, isNil } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { Observable, throwError } from 'rxjs';
import { Client } from '../../client';
import { OnDispose } from '../../lifecycle';
import { InvalidMessageError } from '../error';
import { Pattern, Protocol } from '../packet';
import { TransportOption } from '../context';
import { TransportHandler } from '../handler';


/**
 * abstract transport client.
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

/**
 * default transport client.
 */
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
        return this.handler.handle(option) as Observable<TResult>;
    }

}
