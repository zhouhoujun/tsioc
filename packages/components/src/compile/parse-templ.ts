import { isNullOrUndefined, isArray, IActionSetup, chain, isDefined } from '@tsdi/ioc';
import { BuildHandles, StartupDecoratorRegisterer } from '@tsdi/boot';
import { ITemplateContext, TemplateOptionToken } from './TemplateContext';
import { CTX_COMPONENT_PROVIDER } from '../ComponentProvider';
import { DefaultComponets } from '../IComponentReflect';
import { CTX_COMPONENT_DECTOR } from '../ComponentRef';
import { ComponentBuilderToken } from '../IComponentBuilder';
import { IComponentOption, IComponentContext } from '../ComponentContext';



/**
 * template parse scope.
 *
 * @export
 * @class TemplateParseScope
 * @extends {TemplatesHandle}
 */
export class TemplateParseScope extends BuildHandles<ITemplateContext> implements IActionSetup {
    async execute(ctx: ITemplateContext, next?: () => Promise<void>): Promise<void> {
        await super.execute(ctx);
        // after template parsed.
        if (next) {
            await next();
        }

        // after all clean.
        if (isNullOrUndefined(ctx.value)) {
            setTimeout(() => ctx.destroy());
        }
    }
    setup() {
        this.use(ElementsTemplateHandle)
            .use(TranslateSelectorScope)
            .use(ParseSelectorHandle);
    }
}


/**
 * elements template handle.
 *
 * @export
 * @class ElementsTemplateHandle
 * @extends {TemplateHandle}
 */
export const ElementsTemplateHandle = async function (ctx: ITemplateContext, next: () => Promise<void>): Promise<void> {
    let template = ctx.getTemplate();
    if (isArray(template)) {
        let actInjector = ctx.reflects.getActionInjector();
        ctx.value = await Promise.all(template.filter(e => isDefined(e)).map(async tp => {
            let subCtx = ctx.clone().setOptions({
                template: tp
            });
            await actInjector.getInstance(TemplateParseScope).execute(subCtx);
            if (isNullOrUndefined(subCtx.value)) {
                return tp;
            } else {
                if (!ctx.hasValue(CTX_COMPONENT_PROVIDER)) {
                    ctx.setValue(CTX_COMPONENT_PROVIDER, subCtx.componentProvider);
                }
                return subCtx.value;
            }
        }));
    }

    if (isNullOrUndefined(ctx.value)) {
        await next();
    }
};


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
    let reg = actInjector.getInstance(StartupDecoratorRegisterer).getRegisterer('TranslateTemplate');
    if (ctx.componentDecorator) {
        if (reg.has(ctx.componentDecorator)) {
            await chain(reg.getFuncs(actInjector, ctx.componentDecorator), ctx);
        }
    } else {
        let decorators = ctx.getModuleRef()?.reflect.componentDectors ?? actInjector.getValue(DefaultComponets);
        await chain<ITemplateContext>(decorators.map(decor => async (ctx: ITemplateContext, next) => {
            if (reg.has(decor)) {
                ctx.remove(CTX_COMPONENT_PROVIDER);
                ctx.setValue(CTX_COMPONENT_DECTOR, decor);
                await chain(reg.getFuncs(actInjector, decor), ctx);
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
