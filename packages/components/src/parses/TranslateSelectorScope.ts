import { IActionSetup, PromiseUtil } from '@tsdi/ioc';
import { StartupDecoratorRegisterer, StartupScopes } from '@tsdi/boot';
import { TemplatesHandle } from './TemplateHandle';
import { TemplateContext } from './TemplateContext';
import { CTX_COMPONENT_DECTOR } from '../ComponentRef';



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
    if (ctx.componentDecorator) {
        if (reg.has(ctx.componentDecorator)) {
            await PromiseUtil.runInChain(reg.getFuncs(actInjector, ctx.componentDecorator), ctx);
        }
    } else {
        let decorators = ctx.getModuleRef()?.reflect.componentDectors ?? ['@Component'];
        PromiseUtil.runInChain(decorators.map(decor => async (ctx: TemplateContext, next) => {
            if (reg.has(decor)) {
                ctx.setValue(CTX_COMPONENT_DECTOR, decor);
                await PromiseUtil.runInChain(reg.getFuncs(actInjector, decor), ctx);
            }
            if (!ctx.selector) {
                await next();
            }
        }), ctx);
    }

    if (!ctx.selector) {
        await next();
    }
};

