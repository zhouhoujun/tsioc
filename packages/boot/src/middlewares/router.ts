import { Inject, Injectable, Singleton, Token, tokenId } from '@tsdi/ioc';
import { MessageContext } from './ctx';
import { MessageQueue } from './queue';
import { MessageRoute, RouteVaildator, ROUTE_URL } from './route';




@Injectable()
export class MessageRouter extends MessageQueue {

    constructor(@Inject(ROUTE_URL) private _url: string) {
        super();
    }

    get url() {
        return this._url ?? '';
    }

    private sorted = false;
    async execute(ctx: MessageContext, next?: () => Promise<void>): Promise<void> {
        ctx.injector = this.getInjector();
        if (!ctx.vaild) {
            ctx.vaild = ctx.injector.get(RouteVaildator);
        }
        if ((!ctx.status || ctx.status === 404) && ctx.vaild.isRoute(ctx.url)) {
            if (!this.sorted) {
                this.handles = this.handles.sort((a, b) => {
                    if (a instanceof MessageRoute && b instanceof MessageRoute) {
                        return (b.url || '').length - (a.url || '').length;
                    }
                    return -1;
                });
                this.resetFuncs();
                this.sorted = true;
            }
            await super.execute(ctx);
        }
        if (next) {
            return await next();
        }
    }

    protected resetFuncs() {
        super.resetFuncs();
        this.sorted = false;
    }

}


/**
 * root message queue token.
 */
export const ROOT_MESSAGEQUEUE: Token<MessageRouter> = tokenId<MessageRouter>('ROOT_MESSAGEQUEUE');

/**
 * root message queue token.
 *
 * @deprecated use `ROOT_MESSAGEQUEUE` instead.
 */
export const RootMessageQueueToken = ROOT_MESSAGEQUEUE;

/**
 * message queue.
 *
 * @export
 * @class MessageQueue
 * @extends {BuildHandles<T>}
 * @template T
 */
@Singleton(ROOT_MESSAGEQUEUE)
export class RootMessageQueue extends MessageRouter { }
