import { MetadataService } from '@tsdi/ioc';
import { BuildContext } from './BuildContext';
import { ModuleBuildDecoratorRegisterer } from './ModuleBuildDecoratorRegisterer';
import { ResolveHandle } from './ResolveHandle';


export class DecoratorBuildHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
        let reg = this.container.get(ModuleBuildDecoratorRegisterer);
        let decors = this.getDecortaors(ctx);
        if (decors.length) {
            let hanles = [];
            decors.forEach(d => {
                if (reg.has(d)) {
                    hanles = hanles.concat(reg.getFuncs(this.container, d));
                }
            });
            await this.execFuncs(ctx, hanles, next);
        } else if (next) {
            await next();
        }
    }

    protected getDecortaors(ctx: BuildContext) {
        return this.container
            .get(MetadataService)
            .getClassDecorators(ctx.type);
    }
}

