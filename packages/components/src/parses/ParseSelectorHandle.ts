import { isNullOrUndefined } from '@tsdi/ioc';
import { ParsersHandle } from './ParseHandle';
import { TemplateContext } from './TemplateContext';
import { ComponentBuilderToken } from '../IComponentBuilder';


/**
 * parse selector handle.
 *
 * @export
 * @class ParseSelectorHandle
 * @extends {ParsersHandle}
 */
export class ParseSelectorHandle extends ParsersHandle {
    async execute(ctx: TemplateContext, next: () => Promise<void>): Promise<void> {
        if (ctx.selector) {
            let selector = ctx.selector;
            let options = ctx.getOptions();
            ctx.value = await this.container.resolve(ComponentBuilderToken)
                .resolve(selector, {
                    scope: options.scope,
                    parsing: true,
                    template: options.template,
                    raiseContainer: ctx.getFactory(),
                    providers: ctx.providers
                });
        }
        if (isNullOrUndefined(ctx.value)) {
            await next();
        }
    }
}
