import { ModuleBuilder } from '../../services/ModuleBuilder';
import { BuildContext } from '../BuildContext';


export const BuildModuleHandle = async function (ctx: BuildContext, next: () => Promise<void>): Promise<void> {
    let builder = ctx.getContainer().getService(ctx.injector, { token: ModuleBuilder, target: ctx.type });
    if (builder instanceof ModuleBuilder) {
        ctx.target = await builder.build(ctx.target);
    } else {
        await next();
    }
};
