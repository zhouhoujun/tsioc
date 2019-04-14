import { BootContext } from '../BootContext';
import { Singleton, MetadataService } from '@tsdi/ioc';
import { ModuleBuildDecoratorRegisterer } from '../services';
import { BootHandle } from './BootHandle';


@Singleton
export class DecoratorBuildHandle extends BootHandle {
    async execute(ctx: BootContext, next?: () => Promise<void>): Promise<void> {
        let reg = this.container.get(ModuleBuildDecoratorRegisterer);
        let decors = this.container.get(MetadataService)
            .getClassDecorators(ctx.module);
        let hanles = [];
        decors.forEach(d => {
            if (reg.has(d)) {
                hanles.push(...reg.get(d));
            }
        });
        await this.execActions(ctx, hanles, next);
    }
}
