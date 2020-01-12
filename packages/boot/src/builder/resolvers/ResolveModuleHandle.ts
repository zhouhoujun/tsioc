import { BuildContext } from '../BuildContext';


export const ResolveModuleHandle = async function (ctx: BuildContext, next: () => Promise<void>): Promise<void> {
    if (!ctx.value && ctx.type) {
        ctx.value = ctx.injector.resolve(ctx.type, ctx.providers);
    }
    await next();
};
