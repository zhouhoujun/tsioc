import { BootContext } from '../BootContext';
import { Singleton, MetadataService, isClass } from '@tsdi/ioc';
import { ModuleBuildDecoratorRegisterer } from '../services';
import { BootHandle } from './BootHandle';


@Singleton
export class DecoratorBuildHandle extends BootHandle {
    async execute(ctx: BootContext, next?: () => Promise<void>): Promise<void> {
        let reg = this.container.get(ModuleBuildDecoratorRegisterer);
        let decors = this.getDecortaors(ctx);
        if (decors.length) {
            let hanles = [];
            decors.forEach(d => {
                if (reg.has(d)) {
                    hanles.push(...reg.get(d));
                }
            });
            await this.execActions(ctx, hanles, next);
        } else if (next) {
            await next();
        }
    }

    protected getDecortaors(ctx: BootContext) {
        return this.container.get(MetadataService)
            .getClassDecorators(ctx.module);
    }
}

@Singleton
export class BootDecoratorBuildHandle extends DecoratorBuildHandle {
    protected getDecortaors(ctx: BootContext) {
        if (isClass(ctx.annoation.bootstrap)) {
            return this.container.get(MetadataService)
                .getClassDecorators(ctx.annoation.bootstrap);
        } else {
            return [];
        }
    }
}
