import { ResolveHandle } from './ResolveHandle';
import { BuildContext } from './BuildContext';
import { MetadataService, DesignDecoratorRegisterer, RuntimeDecoratorRegisterer, DecoratorScopes, lang, getOwnTypeMetadata } from '@tsdi/ioc';
import { ModuleDecoratorRegisterer } from '@tsdi/core';
import { ModuleConfigure } from '../../core';

export class InitResolveModuleHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (!ctx.decorator) {
            let decorators = this.container.get(MetadataService)
                .getClassDecorators(ctx.type);
            let mdRgr = this.container.get(ModuleDecoratorRegisterer);
            ctx.decorator = decorators.find(c => mdRgr.has(c));
            if (!ctx.decorator) {
                let designReg = this.container.get(DesignDecoratorRegisterer).getRegisterer(DecoratorScopes.Class)
                ctx.decorator = decorators.find(c => designReg.has(c));
            }
            if (!ctx.decorator) {
                let runtimeReg = this.container.get(RuntimeDecoratorRegisterer).getRegisterer(DecoratorScopes.Class)
                ctx.decorator = decorators.find(c => runtimeReg.has(c));
            }
        }

        if (ctx.decorator) {
            if (!ctx.annoation) {
                ctx.annoation = lang.first(getOwnTypeMetadata<ModuleConfigure>(ctx.decorator, ctx.type));
            }
            await next();
        }
    }
}
