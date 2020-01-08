import { BootContext } from '../BootContext';

/**
 * boot deps handle.
 *
 * @export
 */
export const BootDepsHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    let options = ctx.getOptions();
    if (options.deps && options.deps.length) {
        let container = ctx.getContainer();
        await container.load(ctx.injector, ...options.deps);
    }
    await next();
};
