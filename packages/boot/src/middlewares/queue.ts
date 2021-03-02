import { Injectable, Type, isString, ProviderType } from '@tsdi/ioc';
import { MessageContext, RequestOption } from './ctx';
import { Middleware, Middlewares, MiddlewareType } from './handle';

/**
 * message subscripted.
 */
export interface Subscripted {
    unsubscribe();
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
export class MessageQueue extends Middlewares {

    private completed: ((ctx: MessageContext) => void)[];

    async execute(ctx: MessageContext, next?: () => Promise<void>): Promise<void> {
        const orgInj = ctx.injector;
        ctx.injector = this.getInjector();
        await super.execute(ctx, next);
        if (orgInj) ctx.injector = orgInj;
        this.onCompleted(ctx);
    }

    protected onCompleted(ctx: MessageContext) {
        this.completed?.forEach(cb => {
            cb(ctx);
        });
    }

    /**
     * register completed callbacks.
     * @param callback callback.T
     */
    done(callback: (ctx: MessageContext) => void) {
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
    send(request: RequestOption, ...providers: ProviderType[]): Promise<MessageContext>;
    /**
     * send message
     *
     * @param {string} url route url
     * @param {RequestOption} request request options data.
     * @returns {Promise<MessageContext>}
     */
    send(url: string, request: RequestOption, ...providers: ProviderType[]): Promise<MessageContext>;
    async send(url: any, request?: any, ...providers: ProviderType[]): Promise<MessageContext> {
        const ctx = isString(url) ? { request: { ...request, url, providers } } : { request: { ...url, providers } };
        await this.execute(ctx);
        return ctx;
    }

    /**
     * subescribe message.
     *
     * @param {(ctx: MessageContext, next: () => Promise<void>) => Promise<void>} subscriber
     */
    subscribe(subscriber: (ctx: MessageContext, next: () => Promise<void>) => Promise<void>): Subscripted;
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
     * @param {(ctx: MessageContext, next: () => Promise<void>) => Promise<void>} subscriber
     * @memberof IMessageQueue
     */
    unsubscribe(subscriber: (ctx: MessageContext, next: () => Promise<void>) => Promise<void>);
    /**
     * subscribe message by handle instance;
     *
     * @param {Middleware} handle
     */
    unsubscribe(handle: Middleware);
    /**
     * subscribe message by handle type or token.
     *
     * @param {Type<Middleware>} handle
     */
    unsubscribe(handle: Type<Middleware>);
    unsubscribe(haddle: MiddlewareType) {
        this.unuse(haddle);
    }

}
