import { IBootContext } from '../Context';
import { ConnectionStatupService } from './statup';

export const ConnectionsHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    let servers = ctx.injector.getServices(ConnectionStatupService);
    if (servers && servers.length) {
        await Promise.all(servers.map(ser => {
            ctx.onDestroy(() => ser?.destroy());
            return ser.configureService(ctx)
        }));
    }
    await next();
};
