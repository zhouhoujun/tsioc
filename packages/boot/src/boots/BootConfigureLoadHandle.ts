import { isClass } from '@tsdi/ioc';
import { IBootContext } from '../BootContext';
import { AnnotationMerger } from '../services/AnnotationMerger';
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
export const BootConfigureLoadHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {

    let options = ctx.getOptions();
    let injector = ctx.injector;
    if (isClass(ctx.type)) {
        let baseURL = ctx.baseURL;
        if (baseURL) {
            injector.setValue(ProcessRunRootToken, ctx.baseURL)
        }
    }
    let mgr = injector.getInstance(ConfigureManager);
    if (options.configures && options.configures.length) {
        options.configures.forEach(config => {
            mgr.useConfiguration(config);
        });
    } else {
        // load default config.
        mgr.useConfiguration();
    }
    let config = await mgr.getConfig();
    let annoation = ctx.getAnnoation();
    if (annoation) {
        let merger = ctx.getTargetReflect().getDecorProviders()?.getInstance(AnnotationMerger);
        config = merger ? merger.merge([config, annoation]) : Object.assign({}, config, annoation);
    }

    ctx.setValue(CTX_APP_CONFIGURE, config);

    if (config.deps && config.deps.length) {
        let container = ctx.getContainer();
        await container.load(injector, ...config.deps);
    }
    if (config.baseURL && !ctx.baseURL) {
        ctx.setValue(ProcessRunRootToken, config.baseURL);
        injector.setValue(ProcessRunRootToken, ctx.baseURL);
    }

    await next();
};
