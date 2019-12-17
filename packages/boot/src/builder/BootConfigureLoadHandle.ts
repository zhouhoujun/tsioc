import { DecoratorProvider, isClass } from '@tsdi/ioc';
import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { AnnotationMerger } from '../core';
import { CTX_APP_CONFIGURE } from '../context-tokens';
import { ProcessRunRootToken } from '../annotations/RunnableConfigure';
import { ConfigureManager } from '../annotations/ConfigureManager';

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
        let injector = ctx.injector;
        if (isClass(ctx.module)) {
            let baseURL = ctx.baseURL;
            if (baseURL) {
                injector.registerValue(ProcessRunRootToken, ctx.baseURL)
            }
        }
        let mgr = injector.get(ConfigureManager);
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
            let merger = this.actInjector.getInstance(DecoratorProvider).resolve(ctx.decorator, AnnotationMerger);
            config = merger ? merger.merge([config, ctx.annoation]) : Object.assign({}, config, ctx.annoation);
        }

        ctx.set(CTX_APP_CONFIGURE, config);

        if (config.deps && config.deps.length) {
            let container = ctx.getContainer();
            await container.load(injector, ...config.deps);
        }
        if (config.baseURL && !ctx.baseURL) {
            ctx.setContext(ProcessRunRootToken, config.baseURL);
            injector.registerValue(ProcessRunRootToken, ctx.baseURL);
        }

        await next();
    }
}
