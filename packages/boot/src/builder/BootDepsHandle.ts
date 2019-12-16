import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';

/**
 * boot deps handle.
 *
 * @export
 * @class BootDepsHandle
 * @extends {BootHandle}
 */
export class BootDepsHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        let options = ctx.getOptions();
        if (options.deps && options.deps.length) {
            let container = ctx.getContainer();
            await container.load(ctx.injector, ...options.deps);
        }
        await next();
    }
}
