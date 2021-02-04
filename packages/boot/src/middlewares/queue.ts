import { Injectable, Injector, Type, isPlainObject, isString } from '@tsdi/ioc';
import { MsgContext } from './ctx';
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

    private completed: ((ctx: MsgContext) => void)[];

    async execute(ctx: MsgContext, next?: () => Promise<void>): Promise<void> {
        const orgInj = ctx.injector;
        ctx.injector = this.getInjector();
        if(!ctx.vaild) {
            ctx.vaild = ctx.injector.get(RouteVaildator);
        }
        this.beforeExec(ctx);
        await super.execute(ctx, next);
        this.afterExec(ctx);
        if (orgInj) ctx.injector = orgInj;
        this.onCompleted(ctx);
    }

    protected beforeExec(ctx: MsgContext) {

    }

    protected afterExec(ctx: MsgContext) {

    }

    protected onCompleted(ctx: MsgContext){
        this.completed && this.completed.map(cb => {
            cb(ctx);
        });
    }

    /**
     * register completed callbacks.
     * @param callback callback.T
     */
    done(callback: (ctx: MsgContext) => void) {
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
    send(ctx: MsgContext): Promise<void>;
    /**
     * send message
     *
     * @param {string} url route url
     * @param {*} data query data.
     * @returns {Promise<void>}
     */
    send(url: string, options: {body?: any, query?: any}, injector?: Injector): Promise<void>;
    send(url: any, data?: any, injector?: Injector): Promise<void> {
        if (isPlainObject(url)) {
            return this.execute(url);
        } else if (isString(url)) {
            return this.execute({ url, request: data, injector });
        }
    }

    /**
     * subescribe message.
     *
     * @param {(ctx: MsgContext, next: () => Promise<void>) => Promise<void>} subscriber
     */
    subscribe(subscriber: (ctx: MsgContext, next: () => Promise<void>) => Promise<void>);
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
     * @param {(ctx: MsgContext, next: () => Promise<void>) => Promise<void>} subscriber
     * @memberof IMessageQueue
     */
    unsubscribe(subscriber: (ctx: MsgContext, next: () => Promise<void>) => Promise<void>);
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

