import { ModuleBuilder } from '../../services/ModuleBuilder';
import { BuildContext } from '../BuildContext';


export const BuildModuleHandle = async function (ctx: BuildContext, next: () => Promise<void>): Promise<void> {
    let builder = ctx.injector.getService({ token: ModuleBuilder, target: ctx.type });
    if (builder instanceof ModuleBuilder) {
        ctx.value = await builder.build(ctx.value);
    } else {
        await next();
    }
};
