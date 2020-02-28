import { isNullOrUndefined, isArray, IActionSetup } from '@tsdi/ioc';
import { BuildHandles } from '@tsdi/boot';
import { ITemplateContext } from './TemplateContext';
import { TranslateSelectorScope, ParseSelectorHandle } from './TranslateSelectorScope';
import { CTX_COMPONENT_PROVIDER } from '../ComponentProvider';
import { CTX_TEMPLATE_REF } from '../ComponentRef';



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

        let compPdr = ctx.componentProvider;
        if (ctx.value && compPdr && compPdr.parseRef && !ctx.getOptions().attr && !ctx.hasValue(CTX_TEMPLATE_REF)) {
            let compCtx: ITemplateContext;
            if (compPdr.isTemplateContext(ctx)) {
                compCtx = ctx;
            } else {
                compCtx = compPdr.createTemplateContext(ctx.injector);
                compCtx.context.copy(ctx.context);
            }
            let tempref = isArray(ctx.value) ? compPdr.createTemplateRef(compCtx, ...ctx.value)
                : compPdr.createTemplateRef(compCtx, ctx.value);
            ctx.setValue(CTX_TEMPLATE_REF, tempref);
        }

        // after all clean.
        if (isNullOrUndefined(ctx.value)) {
            ctx.destroy();
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
        ctx.value = await Promise.all(template.map(async tp => {
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

