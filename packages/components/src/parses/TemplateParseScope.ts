import { isNullOrUndefined, isArray, IActionSetup } from '@tsdi/ioc';
import { TemplatesHandle } from './TemplateHandle';
import { TemplateContext } from './TemplateContext';
import { ParseSelectorHandle } from './ParseSelectorHandle';
import { TranslateSelectorScope } from './TranslateSelectorScope';


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
        // after all clean.
        if (isNullOrUndefined(ctx.value)) {
            ctx.clear();
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
                template: tp,
                decorator: ctx.decorator
            });
            await actInjector.getInstance(TemplateParseScope).execute(subCtx);
            return isNullOrUndefined(subCtx.value) ? tp : subCtx.value;
        }));
    }

    if (isNullOrUndefined(ctx.value)) {
        await next();
    }

};

