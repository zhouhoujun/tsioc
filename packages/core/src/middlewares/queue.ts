import { Injectable, Type, isString, ProviderType, lang, AsyncHandler, isFunction, Inject, Injector, RegisteredState } from '@tsdi/ioc';
import { Context, RequestOption } from './ctx';
import { Middleware, Middlewares, MiddlewareType } from './handle';

/**
 * message subscripted.
 */
export interface Subscripted {
    unsubscribe(): void;
}

/**
 * composite message.
 *
 * @export
 * @abstract
 * @class MessageQueue
 * @extends {Middlewares}
 * @template T
 */
@Injectable()
export class MessageQueue<T extends Context = Context> extends Middlewares<T> {

    @Inject()
    protected injector!: Injector;

    private completed!: ((ctx: T) => void)[];

    override async execute(ctx: T, next?: () => Promise<void>): Promise<void> {
        try {
            if (this.canExecute(ctx)) {
                this.beforeExec(ctx);
                await super.execute(ctx);
                this.afterExec(ctx);
            }
            if (next) {
                await next();
            }
        } catch (err) {
            this.onFailed(ctx, err as Error)
        } finally {
            this.onCompleted(ctx);
        }
    }

    protected canExecute(ctx: T): boolean {
        return !!ctx.request;
    }

    protected beforeExec(ctx: T): void { }

    protected afterExec(ctx: T): void { }

    protected onCompleted(ctx: T): void {
        this.completed?.forEach(cb => {
            cb(ctx);
        });
    }

    protected onFailed(ctx: T, err: Error): void {
        ctx.status = 500;
        ctx.message = err.stack;
        ctx.error = err;
    }

    /**
     * register completed callbacks.
     * @param callback callback.T
     */
    done(callback: (ctx: T) => void) {
        if (!this.completed) {
            this.completed = [];
        }
        this.completed.push(callback);
    }

    /**
     * send message
     *
     * @param {RequestOption} request request option
     * @param {() => Promise<void>} [next]
     * @returns {Promise<void>}
     */
    send(request: RequestOption, ...providers: ProviderType[]): Promise<T>;
    /**
     * send message
     *
     * @param {string} url route url
     * @param {RequestOption} request request options data.
     * @returns {Promise<T>}
     */
    send(url: string, request: RequestOption, ...providers: ProviderType[]): Promise<T>;
    async send(url: any, request?: any, ...providers: ProviderType[]): Promise<T> {
        const ctx = isString(url) ? { request: { ...request, url, providers } } as T : { request: { ...url, providers } } as T;
        await this.execute(ctx);
        return ctx;
    }

    /**
     * subescribe message.
     *
     * @param {(ctx: T, next: () => Promise<void>) => Promise<void>} subscriber
     */
    subscribe(subscriber: (ctx: Context, next: () => Promise<void>) => Promise<void>): Subscripted;
    /**
     * subscribe message by handle instance;
     *
     * @param {Middleware} handle
     */
    subscribe(handle: Middleware): Subscripted;
    /**
     * subscribe message by handle type or token.
     *
     * @param {Type<Middleware>} handle
     */
    subscribe(handle: Type<Middleware>): Subscripted;
    subscribe(haddle: MiddlewareType) {
        this.use(haddle);
        return {
            unsubscribe: () => this.unsubscribe(haddle as any)
        };
    }

    /**
     * subescribe message.
     *
     * @param {(ctx: Context, next: () => Promise<void>) => Promise<void>} subscriber
     * @memberof IMessageQueue
     */
    unsubscribe(subscriber: (ctx: Context, next: () => Promise<void>) => Promise<void>): void;
    /**
     * subscribe message by handle instance;
     *
     * @param {Middleware} handle
     */
    unsubscribe(handle: Middleware): void;
    /**
     * subscribe message by handle type or token.
     *
     * @param {Type<Middleware>} handle
     */
    unsubscribe(handle: Type<Middleware>): void;
    unsubscribe(haddle: MiddlewareType): void {
        this.unuse(haddle);
    }

    protected override parseHandle(state: RegisteredState, mdty: MiddlewareType): AsyncHandler<T> {
        if (mdty instanceof Middleware) {
            return mdty.toHandle();
        } else if (lang.isBaseOf(mdty, Middleware)) {
            if (!state.isRegistered(mdty)) {
                this.injector.register(mdty);
            }
            const handle = this.injector.get(mdty) ?? state.getInstance(mdty);
            return handle?.toHandle?.();
        } else if (isFunction(mdty)) {
            return mdty;
        }
        return null!;
    }

}
