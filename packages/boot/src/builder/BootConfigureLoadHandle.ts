import { DecoratorProvider, isClass } from '@tsdi/ioc';
import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { ConfigureManager, ProcessRunRootToken } from '../annotations';
import { AnnotationMerger } from '../core';
import { CTX_APP_CONFIGURE } from '../context-tokens';

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
        let options = ctx.getOptions();
        if (isClass(ctx.module)) {
            let baseURL = ctx.baseURL;
            if (baseURL) {
                this.container.bindProvider(ProcessRunRootToken, ctx.baseURL)
            }
        }
        let mgr = this.resolve(ctx, ConfigureManager);
        if (options.configures && options.configures.length) {
            options.configures.forEach(config => {
                mgr.useConfiguration(config);
            });
        } else {
            // load default config.
            mgr.useConfiguration();
        }
        let config = await mgr.getConfig();
        if (ctx.annoation) {
            let merger = this.container.getInstance(DecoratorProvider).resolve(ctx.decorator, AnnotationMerger);
            config = merger ? merger.merge([config, ctx.annoation]) : Object.assign({}, config, ctx.annoation);
        }

        ctx.set(CTX_APP_CONFIGURE, config);

        if (config.deps && config.deps.length) {
            let container = ctx.getRaiseContainer();
            await container.load(...config.deps);
        }
        if (config.baseURL && !ctx.baseURL) {
            ctx.setContext(ProcessRunRootToken, config.baseURL);
            this.container.bindProvider(ProcessRunRootToken, ctx.baseURL);
        }

        await next();
    }
}
