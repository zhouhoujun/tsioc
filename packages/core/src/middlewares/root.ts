import { Autorun, Singleton, Token, tokenId } from '@tsdi/ioc';
import { ApplicationContext } from '../Context';
import { Context } from './context';
import { MessageQueue } from './queue';
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

    setup() {
        this.use(
            initQueue,
            RootRouter
        );
    }
}

/**
 * init queue.
 * @param ctx 
 * @param next 
 */
export const initQueue = async (ctx: Context, next: () => Promise<void>) => {

    const logger = ctx.injector.get(ApplicationContext).getLogManager()?.getLogger();
    const start = Date.now();
    logger?.debug(ctx.method, ctx.url);
    try {
        await next();
    } catch (error) {
        const err = error as any; 
        logger.error(err);
        console.error(err);
        ctx.status = err.status ?? 500;
        ctx.message = err.message ?? err.toString();
        throw err;
    } finally {
        logger?.debug(ctx.method, ctx.url, `- ${Date.now() - start}ms`);
    }
};