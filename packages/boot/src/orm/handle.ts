import { ApplicationContext } from '../Context';
import { ConnectionStatupService } from './startup';

/**
 * connection handle.
 * @param ctx context.
 * @param next next dispatch
 */
export const ConnectionsHandle = async function (ctx: ApplicationContext, next: () => Promise<void>): Promise<void> {
    let servers = ctx.injector.getServices(ConnectionStatupService);
    if (servers && servers.length) {
        await Promise.all(servers.map(ser => {
            ctx.onDestroy(() => ser?.destroy());
            return ser.configureService(ctx)
        }));
    }
    await next();
};
