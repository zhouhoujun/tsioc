import { DecoratorProvider, isClass } from '@tsdi/ioc';
import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { ConfigureManager } from '../annotations';
import { AnnotationServiceToken, AnnotationMerger } from '../core';
import { BuilderServiceToken } from './IBuilderService';

/**
 * boot configure load handle.
 *
 * @export
 * @class BootConfigureLoadHandle
 * @extends {BootHandle}
 */
export class BootConfigureLoadHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (!(ctx instanceof BootContext)) {
            return;
        }

        let mgr = this.resolve(ctx, ConfigureManager);
        if (ctx.configures && ctx.configures.length) {
            ctx.configures.forEach(config => {
                mgr.useConfiguration(config);
            });
        } else {
            // load default config.
            mgr.useConfiguration();
        }

        let config = await mgr.getConfig();
        let annService = this.container.get(AnnotationServiceToken);
        if (isClass(ctx.module)) {
            ctx.decorator = ctx.decorator || annService.getDecorator(ctx.module);
            if (!ctx.annoation) {
                ctx.annoation = this.container.get(AnnotationServiceToken).getAnnoation(ctx.module, ctx.decorator);
            }
            let merger = this.container.getInstance(DecoratorProvider).resolve(ctx.decorator, AnnotationMerger);
            config = ctx.configuration = merger ? merger.merge([config, ctx.annoation]) : Object.assign({}, config, ctx.annoation);
        } else {
            ctx.configuration = config;
        }
        if (config.deps && config.deps.length) {
            let container = ctx.getRaiseContainer();
            await container.load(...config.deps);
        }
        if (config.baseURL) {
            ctx.baseURL = config.baseURL;
        }

        await next();
    }
}
