import { MetadataService, isClass } from '@tsdi/ioc';
import { ModuleBuildDecoratorRegisterer } from '../../services';
import { Handle } from '../../core';
import { BuildContext } from './BuildContext';


export class DecoratorBuildHandle extends Handle<BuildContext> {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
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

    protected getDecortaors(ctx: BuildContext) {
        return this.container.get(MetadataService)
            .getClassDecorators(ctx.type);
    }
}

