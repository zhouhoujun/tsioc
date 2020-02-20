import { isNullOrUndefined, isArray, IActionSetup } from '@tsdi/ioc';
import { BuildHandles } from '@tsdi/boot';
import { ITemplateContext } from './ITemplateContext';
import { TranslateSelectorScope, ParseSelectorHandle } from './TranslateSelectorScope';
import { CTX_COMPONENT_PROVIDER } from '../ComponentProvider';



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

        if (ctx.value && ctx.getOptions().tempRef) {
            let compPdr = ctx.componentProvider;
            if (compPdr) {
                let compCtx: ITemplateContext;
                if (compPdr.isTemplateContext(ctx)) {
                    compCtx = ctx;
                } else {
                    ctx = compPdr.createTemplateContext(ctx.injector);
                    ctx.setParent(ctx);
                }
                ctx.value = isArray(ctx.value) ? compPdr.createTemplateRef(compCtx, ...ctx.value)
                    : compPdr.createTemplateRef(compCtx, ctx.value);
            }
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

