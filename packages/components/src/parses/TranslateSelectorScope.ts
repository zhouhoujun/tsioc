import { IActionSetup, PromiseUtil, isNullOrUndefined } from '@tsdi/ioc';
import { BuildHandles, StartupDecoratorRegisterer, StartupScopes } from '@tsdi/boot';
import { ITemplateContext, TemplateOptionToken } from './TemplateContext';
import { CTX_COMPONENT_DECTOR } from '../ComponentRef';
import { DefaultComponets } from '../IComponentReflect';
import { CTX_COMPONENT_PROVIDER } from '../ComponentProvider';
import { ComponentBuilderToken } from '../IComponentBuilder';
import { IComponentOption, IComponentContext } from '../ComponentContext';



/**
 * translate selector scope.
 *
 * @export
 * @class TranslateSelectorScope
 * @extends {TemplatesHandle}
 */
export class TranslateSelectorScope extends BuildHandles<ITemplateContext> implements IActionSetup {
    async execute(ctx: ITemplateContext, next?: () => Promise<void>): Promise<void> {
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
export const TranslateElementHandle = async function (ctx: ITemplateContext, next: () => Promise<void>): Promise<void> {
    let actInjector = ctx.reflects.getActionInjector();
    let reg = actInjector.getInstance(StartupDecoratorRegisterer).getRegisterer(StartupScopes.TranslateTemplate);
    if (ctx.componentDecorator) {
        if (reg.has(ctx.componentDecorator)) {
            await PromiseUtil.runInChain(reg.getFuncs(actInjector, ctx.componentDecorator), ctx);
        }
    } else {
        let decorators = ctx.getModuleRef()?.reflect.componentDectors ?? actInjector.getSingleton(DefaultComponets);
        PromiseUtil.runInChain(decorators.map(decor => async (ctx: ITemplateContext, next) => {
            if (reg.has(decor)) {
                ctx.remove(CTX_COMPONENT_PROVIDER);
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
}

/**
 * parse selector handle.
 *
 * @export
 * @class ParseSelectorHandle
 * @extends {ParsersHandle}
 */
export const ParseSelectorHandle = async function (ctx: ITemplateContext, next: () => Promise<void>): Promise<void> {
    if (ctx.selector) {
        let selector = ctx.selector;
        let template = ctx.getTemplate();
        let compCtx = await ctx.getContainer().getInstance(ComponentBuilderToken)
            .build(<IComponentOption>{
                type: selector,
                parent: ctx,
                sub: true,
                template: template,
                providers: ctx.providers.inject({ provide: TemplateOptionToken, useValue: ctx.getOptions() })
            }) as IComponentContext;
        if (compCtx.value) {
            if (!ctx.hasValue(CTX_COMPONENT_PROVIDER)) {
                ctx.setValue(CTX_COMPONENT_PROVIDER, compCtx.componentProvider);
            }
            ctx.value = compCtx.value;
        }
    }
    if (isNullOrUndefined(ctx.value)) {
        await next();
    }
}
