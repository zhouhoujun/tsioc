import { Singleton } from '@tsdi/ioc';
import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { ModuleBuilder } from '../services';

@Singleton
export class BuildModuleHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        let builder = this.container.getService(ModuleBuilder, ctx.module);
        if (builder instanceof ModuleBuilder) {
            ctx.target = await builder.build(ctx.target);
        } else {
            await next();
        }
    }
}
