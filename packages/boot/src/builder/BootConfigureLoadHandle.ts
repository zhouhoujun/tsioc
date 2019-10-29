import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { ConfigureManager } from '../annotations';
import { AnnotationServiceToken, AnnotationMerger } from '../core';
import { DecoratorProvider } from '@tsdi/ioc';

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
        let annService = this.container.get(AnnotationServiceToken);
        ctx.decorator = annService.getDecorator(ctx.module);
        if (!ctx.annoation) {
            ctx.annoation = this.container.get(AnnotationServiceToken).getAnnoation(ctx.module, ctx.decorator);
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
        let merge = this.container.getInstance(DecoratorProvider).resolve(ctx.decorator, AnnotationMerger);
        config = ctx.configuration = merge ? merge.merge([config, ctx.annoation]) : Object.assign({}, config, ctx.annoation);
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
