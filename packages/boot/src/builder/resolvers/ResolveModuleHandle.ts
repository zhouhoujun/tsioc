import { BuildContext } from '../BuildContext';
import { ResolveHandle } from './ResolveHandle';


export const ResolveModuleHandle = async function (ctx: BuildContext, next: () => Promise<void>): Promise<void> {
    if (!ctx.target) {
        ctx.target = ctx.injector.resolve(ctx.type, ctx.providers);
    }

    if (ctx.target) {
        await next();
    }
};
