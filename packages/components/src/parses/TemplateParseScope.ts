import { isNullOrUndefined, isArray } from '@tsdi/ioc';
import { HandleRegisterer } from '@tsdi/boot';
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
export class TemplateParseScope extends TemplatesHandle {
    async execute(ctx: TemplateContext, next?: () => Promise<void>): Promise<void> {
        await super.execute(ctx);
        if (isNullOrUndefined(ctx.value) && next) {
            await next();
        }
    }
    setup() {
        this.use(ElementsTemplateHandle)
            .use(TranslateSelectorScope, true)
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
export class ElementsTemplateHandle extends TemplateHandle {

    async execute(ctx: TemplateContext, next: () => Promise<void>): Promise<void> {
        let registerer = this.container.getInstance(HandleRegisterer);
        let options = ctx.getOptions();
        if (isArray(options.template)) {
            ctx.value = await Promise.all(options.template.map(async tp => {
                let subCtx = TemplateContext.parse({
                    scope: options.scope,
                    template: tp,
                    decorator: ctx.decorator,
                    raiseContainer: ctx.getFactory()
                });
                await registerer.get(TemplateParseScope).execute(subCtx);
                return isNullOrUndefined(subCtx.value) ? tp : subCtx.value;
            }));
        }

        if (isNullOrUndefined(ctx.value)) {
            await next();
        }

    }
}

