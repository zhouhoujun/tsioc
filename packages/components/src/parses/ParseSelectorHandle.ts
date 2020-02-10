import { isNullOrUndefined } from '@tsdi/ioc';
import { ITemplateContext, TemplateOptionToken } from './TemplateContext';
import { ComponentBuilderToken } from '../IComponentBuilder';
import { IComponentOption } from '../ComponentContext';


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
        let template = ctx.template;
        ctx.value = await ctx.getContainer().getInstance(ComponentBuilderToken)
            .resolve({
                type: selector,
                parent: ctx,
                template: template,
                injector: ctx.injector,
                providers: ctx.providers.inject({ provide: TemplateOptionToken, useValue: ctx.getOptions() })
            });
    }
    if (isNullOrUndefined(ctx.value)) {
        await next();
    }
};
