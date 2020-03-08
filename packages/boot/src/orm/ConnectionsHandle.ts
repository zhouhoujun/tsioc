import { IBootContext } from '../BootContext';
import { ConnectionStatupService } from './ConnectionStatupService';

export const ConnectionsHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    let servers = ctx.injector.getServices(ConnectionStatupService);
    if (servers && servers.length) {
        await Promise.all(servers.map(ser => ser.configureService(ctx)));
    }
    return next();
};
