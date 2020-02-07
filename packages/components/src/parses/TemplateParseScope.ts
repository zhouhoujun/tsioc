import { isNullOrUndefined, isArray, IActionSetup } from '@tsdi/ioc';
import { TemplatesHandle } from './TemplateHandle';
import { ITemplateContext } from './TemplateContext';
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
    async execute(ctx: ITemplateContext, next?: () => Promise<void>): Promise<void> {
        await super.execute(ctx);
        // after template parsed.
        if (next) {
            await next();
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
    let template = ctx.template;
    if (isArray(template)) {
        let actInjector = ctx.reflects.getActionInjector();
        ctx.value = await Promise.all(template.map(async tp => {
            let subCtx = ctx.clone(true).setOptions({
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

