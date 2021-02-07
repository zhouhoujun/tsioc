import { Autorun, isArray, PROVIDERS, Singleton, Token, tokenId } from '@tsdi/ioc';
import { BOOTCONTEXT } from '../tk';
import { MessageContext } from './ctx';
import { MessageQueue } from './queue';
import { RouteVaildator } from './route';
import { RootRouter } from './router';

/**
 * root message queue token.
 */
export const ROOT_QUEUE: Token<MessageQueue> = tokenId<MessageQueue>('ROOT_QUEUE');

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
@Autorun('setup')
export class RootMessageQueue extends MessageQueue {

    constructor() {
        super();
    }

    setup() {
        this.use(
            initQueue,
            RootRouter
        );
    }
}


function getValue<T>(this: MessageContext, token: Token<T>): T {
    return this.providers.getValue(token);
}

function setValue(this: MessageContext, token: Token, value: any): void {
    this.providers.setValue(token, value);
}


/**
 * init queue.
 * @param ctx 
 * @param next 
 */
export const initQueue = async (ctx: MessageContext, next: () => Promise<void>) => {
    const { injector, request } = ctx;
    ctx.vaild = injector.get(RouteVaildator);
    ctx.providers = injector.get(PROVIDERS);
    
    if (!ctx.vaild) {
        ctx.vaild = ctx.injector.get(RouteVaildator);
    }

    if (request.providers) {
        ctx.providers.inject(...isArray(request.providers) ? request.providers : [request.providers]);
    }

    if (!ctx.method) {
        Object.assign(ctx, { event: request.event, method: request.method });
    }

    Object.defineProperties(ctx, {
        getValue: {
            value: getValue,
            writable: false,
            enumerable: false
        },
        setValue: {
            value: setValue,
            writable: false,
            enumerable: false
        }
    });

    const logger = injector.getInstance(BOOTCONTEXT).getLogManager()?.getLogger();
    const start = Date.now();
    logger?.debug(ctx.method, ctx.url);
    try {
        await next();
    } catch (err) {
        logger?.error(err);
        ctx.status = 500;
        ctx.error = err;
        throw err;
    } finally {
        logger?.debug(ctx.method, ctx.url, `- ${Date.now() - start}ms`);
    }
};