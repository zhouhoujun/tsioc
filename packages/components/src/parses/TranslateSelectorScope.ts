import { IActionSetup, PromiseUtil } from '@tsdi/ioc';
import { StartupDecoratorRegisterer, StartupScopes } from '@tsdi/boot';
import { TemplatesHandle } from './TemplateHandle';
import { TemplateContext } from './TemplateContext';



/**
 * translate selector scope.
 *
 * @export
 * @class TranslateSelectorScope
 * @extends {TemplatesHandle}
 */
export class TranslateSelectorScope extends TemplatesHandle implements IActionSetup {
    async execute(ctx: TemplateContext, next?: () => Promise<void>): Promise<void> {
        await super.execute(ctx);
        if (next) {
            await next();
        }
    }
    setup() {
        this.use(TranslateElementHandle);
    }
}

/**
 * translate element handle.
 *
 * @export
 * @class TranslateElementHandle
 * @extends {TemplateHandle}
 */
export const TranslateElementHandle = async function (ctx: TemplateContext, next: () => Promise<void>): Promise<void> {
    let actInjector = ctx.reflects.getActionInjector();
    let reg = actInjector.getInstance(StartupDecoratorRegisterer).getRegisterer(StartupScopes.TranslateTemplate);
    if (reg.has(ctx.decorator)) {
        await PromiseUtil.runInChain(reg.getFuncs(actInjector, ctx.decorator), ctx);
    }

    if (!ctx.selector) {
        await next();
    }
};

