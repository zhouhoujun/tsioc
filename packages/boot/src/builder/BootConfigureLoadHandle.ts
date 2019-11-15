import { DecoratorProvider, isClass } from '@tsdi/ioc';
import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { ConfigureManager, ProcessRunRootToken } from '../annotations';
import { AnnotationServiceToken, AnnotationMerger } from '../core';

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

        if (isClass(ctx.module)) {
            let annService = this.container.get(AnnotationServiceToken);
            ctx.decorator = ctx.decorator || annService.getDecorator(ctx.module);
            if (!ctx.annoation) {
                ctx.annoation = annService.getAnnoation(ctx.module, ctx.decorator);
            }
            if (!ctx.baseURL && ctx.annoation) {
                ctx.baseURL = ctx.annoation.baseURL;
            }
        }
        if (ctx.baseURL) {
            this.container.bindProvider(ProcessRunRootToken, ctx.baseURL);
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
        if (ctx.annoation) {
            let merger = this.container.getInstance(DecoratorProvider).resolve(ctx.decorator, AnnotationMerger);
            config = ctx.configuration = merger ? merger.merge([config, ctx.annoation]) : Object.assign({}, config, ctx.annoation);
        }

        ctx.configuration = config;

        if (config.deps && config.deps.length) {
            let container = ctx.getRaiseContainer();
            await container.load(...config.deps);
        }
        if (config.baseURL && !ctx.baseURL) {
            ctx.baseURL = config.baseURL;
            this.container.bindProvider(ProcessRunRootToken, ctx.baseURL);
        }

        await next();
    }
}
