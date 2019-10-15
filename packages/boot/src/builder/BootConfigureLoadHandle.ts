import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { ConfigureManager } from '../annotations';

/**
 * boot configure load handle.
 *
 * @export
 * @class BootConfigureLoadHandle
 * @extends {BootHandle}
 */
export class BootConfigureLoadHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (!(ctx instanceof BootContext)) {
            return;
        }
        let mgr = this.resolve(ctx, ConfigureManager);

        if (ctx.configures && ctx.configures.length) {
            ctx.configures.forEach(config => {
                mgr.useConfiguration(config);
            });
        } else {
            // load default config.
            mgr.useConfiguration();
        }

        let config = await mgr.getConfig();
        config = ctx.configuration = Object.assign({}, config, ctx.annoation);
        if (config.deps && config.deps.length) {
            let container = ctx.getRaiseContainer();
            await container.load(...config.deps);
        }
        if (config.baseURL) {
            ctx.baseURL = config.baseURL;
        }

        await next();
    }
}
