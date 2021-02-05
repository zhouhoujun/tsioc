import { Injectable, Injector, Type, isPlainObject, tokenId, Singleton } from '@tsdi/ioc';
import { MessageContext } from './ctx';
import { Middleware, Middlewares, MiddlewareType } from './handle';
import { RouteVaildator } from './route';



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
        if (!ctx.vaild) {
            ctx.vaild = ctx.injector.get(RouteVaildator);
        }
        this.beforeExec(ctx);
        await super.execute(ctx, next);
        this.afterExec(ctx);
        if (orgInj) ctx.injector = orgInj;
        this.onCompleted(ctx);
    }

    protected beforeExec(ctx: MessageContext) { }

    protected afterExec(ctx: MessageContext) { }

    protected onCompleted(ctx: MessageContext) {
        this.completed && this.completed.map(cb => {
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
     * @param {T} ctx message context
     * @param {() => Promise<void>} [next]
     * @returns {Promise<void>}
     */
    send(ctx: MessageContext): Promise<MessageContext>;
    /**
     * send message
     *
     * @param {string} url route url
     * @param {*} data query data.
     * @returns {Promise<MessageContext>}
     */
    send(url: string, options: { body?: any, query?: any }, injector?: Injector): Promise<MessageContext>;
    async send(url: any, data?: any, injector?: Injector): Promise<MessageContext> {
        let ctx: MessageContext = isPlainObject(url) ? url : { url, request: data, injector };
        await this.execute(url);
        return ctx;
    }

    /**
     * subescribe message.
     *
     * @param {(ctx: MessageContext, next: () => Promise<void>) => Promise<void>} subscriber
     */
    subscribe(subscriber: (ctx: MessageContext, next: () => Promise<void>) => Promise<void>);
    /**
     * subscribe message by handle instance;
     *
     * @param {Middleware} handle
     */
    subscribe(handle: Middleware);
    /**
     * subscribe message by handle type or token.
     *
     * @param {Type<Middleware>} handle
     */
    subscribe(handle: Type<Middleware>);
    subscribe(haddle: MiddlewareType) {
        this.use(haddle);
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


export const ROOT_QUEUE = tokenId<MessageQueue>('ROOT_QUEUE');

/**
 * root message queue token.
 *
 * @deprecated use `ROOT_QUEUE` instead.
 */
export const RootMessageQueueToken = ROOT_QUEUE;

/**
 * root queue.
 */
@Singleton(ROOT_QUEUE)
export class RootMessageQueue extends MessageQueue {

}


