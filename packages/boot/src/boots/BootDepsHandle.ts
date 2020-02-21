import { IBootContext } from '../BootContext';

/**
 * boot deps handle.
 *
 * @export
 */
export const BootDepsHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    let options = ctx.getOptions();
    if (options.deps && options.deps.length) {
        await ctx.injector.load(...options.deps);
    }
    await next();
};
