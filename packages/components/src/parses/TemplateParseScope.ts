import { isNullOrUndefined, isArray, IActionSetup, DecoratorProvider, lang } from '@tsdi/ioc';
import { TemplatesHandle } from './TemplateHandle';
import { TemplateContext } from './TemplateContext';
import { ParseSelectorHandle } from './ParseSelectorHandle';
import { TranslateSelectorScope } from './TranslateSelectorScope';
import { RefSelector } from '../RefSelector';
import { CompContext } from './CompContext';
import { CTX_COMPONENT_DECTOR, CTX_TEMPLATE_REF, CTX_COMPONENT, ElementRef, ContextNode } from '../ComponentRef';


/**
 * template parse scope.
 *
 * @export
 * @class TemplateParseScope
 * @extends {TemplatesHandle}
 */
export class TemplateParseScope extends TemplatesHandle implements IActionSetup {
    async execute(ctx: TemplateContext, next?: () => Promise<void>): Promise<void> {
        await super.execute(ctx);
        // after template parsed.
        if (isNullOrUndefined(ctx.value) && next) {
            await next();
        }

        if (ctx.value) {
            // let parent = ctx.getParent();
            let decor: string;
            if (!ctx.componentDecorator) {
                let node = (isArray(ctx.value) ? lang.first(ctx.value) : ctx.value) as ContextNode;
                decor = (node.context as CompContext)?.componentDecorator;
                decor && ctx.set(CTX_COMPONENT_DECTOR, decor);
            } else {
                decor = ctx.componentDecorator;
            }
            let refSeltor = this.actInjector.getInstance(DecoratorProvider).resolve(decor, RefSelector);
            let tempRef = refSeltor.createTemplateRef(ctx, ...(isArray(ctx.value) ? ctx.value : [ctx.value]));
            ctx.set(CTX_TEMPLATE_REF, tempRef);

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
export const ElementsTemplateHandle = async function (ctx: TemplateContext, next: () => Promise<void>): Promise<void> {
    let template = ctx.template;
    if (isArray(template)) {
        let actInjector = ctx.reflects.getActionInjector();
        ctx.value = await Promise.all(template.map(async tp => {
            let subCtx = TemplateContext.parse(ctx.injector, {
                parent: ctx,
                template: tp
            });
            await actInjector.getInstance(TemplateParseScope).execute(subCtx);
            return isNullOrUndefined(subCtx.value) ? tp : subCtx.value;
        }));
    }

    if (isNullOrUndefined(ctx.value)) {
        await next();
    }

};

