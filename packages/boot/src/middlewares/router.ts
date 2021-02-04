import { Singleton } from '@tsdi/ioc';
import { MsgContext } from './ctx';
import { MessageQueue } from './queue';
import { MessageRoute, RouteVaildator } from './route';




@Singleton()
export class MessageRouter extends MessageQueue {
    private sorted = false;
    async execute(ctx: MsgContext, next?: () => Promise<void>): Promise<void> {
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


}
