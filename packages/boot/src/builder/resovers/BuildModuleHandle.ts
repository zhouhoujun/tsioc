import { ModuleBuilder } from '../../services';
import { Handle } from '../../core';
import { BuildContext } from './BuildContext';


export class BuildModuleHandle extends Handle<BuildContext> {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        let builder = this.container.getService(ModuleBuilder, ctx.type);
        if (builder instanceof ModuleBuilder) {
            ctx.target = await builder.build(ctx.target);
        } else {
            await next();
        }
    }
}
