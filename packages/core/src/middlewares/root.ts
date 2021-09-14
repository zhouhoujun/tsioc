import { Autorun, Injector, lang, Singleton, Token, tokenId } from '@tsdi/ioc';
import { ApplicationContext } from '../Context';
import { Context } from './ctx';
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

    setup() {
        this.use(
            initQueue,
            RootRouter
        );
    }
}


function getValue<T>(this: Context, token: Token<T>): T {
    return this.injector.get(token);
}

function setValue(this: Context, token: Token, value: any): void {
    this.injector.setValue(token, value);
}

const protocolReg = /^\w+:\/\//;
/**
 * init queue.
 * @param ctx 
 * @param next 
 */
export const initQueue = async (ctx: Context, next: () => Promise<void>) => {
    const { injector, request } = ctx;
    ctx.vaild = injector.get(RouteVaildator);

    if (!ctx.vaild) {
        ctx.vaild = ctx.injector.get(RouteVaildator);
    }

    const providers = request.providers || [];

    if (request.restful) {
        let matchs = request.url?.match(/\/:\w+/gi);
        if (matchs) {
            matchs.forEach(m => {
                const pn = m.slice(2);
                if (request.restful?.[pn]) {
                    request.url = request.url?.replace(m, `/${request.restful[pn]}`);
                }
            });
        }
    }

    if (!request.protocol) {
        const match = lang.first(request.url?.match(protocolReg));
        const protocol = match ? match.toString().replace('//', '').trim() : '';
        Object.defineProperty(request, 'protocol', {
            get: () => protocol
        });
    }

    Object.defineProperties(ctx, {
        url: {
            get: () => request.url,
            enumerable: false
        },
        protocol: {
            get: () => request.protocol,
            enumerable: false
        },
        providers: {
            get: () => providers,
            enumerable: false
        },
        event: {
            get: () => request.event,
            enumerable: false
        },
        method: {
            get: () => request.method,
            enumerable: false
        },
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

    const logger = injector.get(ApplicationContext).getLogManager()?.getLogger();
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