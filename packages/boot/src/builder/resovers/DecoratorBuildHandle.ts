import { MetadataService } from '@tsdi/ioc';
import { BuildContext } from './BuildContext';
import { BuildDecoratorRegisterer } from './BuildDecoratorRegisterer';
import { ResolveHandle } from './ResolveHandle';


export class DecoratorBuildHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
        let reg = this.container.get(BuildDecoratorRegisterer);
        await this.execFuncs(ctx, reg.getFuncs(this.container, ctx.decorator));

        if (next) {
            await next();
        }
    }

    protected getDecortaors(ctx: BuildContext) {
        return this.container
            .get(MetadataService)
            .getClassDecorators(ctx.type);
    }
}

