import { isNullOrUndefined, isArray, IActionSetup } from '@tsdi/ioc';
import { TemplateHandle, TemplatesHandle } from './TemplateHandle';
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
        if (isNullOrUndefined(ctx.value) && next) {
            await next();
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
    let options = ctx.getOptions();
    if (isArray(options.template)) {
        let actInjector = ctx.reflects.getActionInjector();
        ctx.value = await Promise.all(options.template.map(async tp => {
            let subCtx = TemplateContext.parse(ctx.injector, {
                scope: options.scope,
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

