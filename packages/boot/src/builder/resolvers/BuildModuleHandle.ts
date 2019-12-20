import { ModuleBuilder } from '../../services/ModuleBuilder';
import { BuildContext } from '../BuildContext';
import { ResolveHandle } from './ResolveHandle';


export class BuildModuleHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        let builder = ctx.getContainer().getService({ token: ModuleBuilder, target: ctx.module });
        if (builder instanceof ModuleBuilder) {
            ctx.target = await builder.build(ctx.target);
        } else {
            await next();
        }
    }
}
