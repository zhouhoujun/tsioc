import { ParsersHandle } from './ParseHandle';
import { TemplateContext } from './TemplateContext';
import { isNullOrUndefined } from '@tsdi/ioc';
import { BuilderServiceToken, RegFor } from '@tsdi/boot';


export class ParseSelectorHandle extends ParsersHandle {
    async execute(ctx: TemplateContext, next: () => Promise<void>): Promise<void> {
        if (ctx.selector) {
            let selector = ctx.selector;
            let container = ctx.getRaiseContainer();
            if (container.has(selector)) {
                ctx.value = await this.container.get(BuilderServiceToken).resolve(selector, {
                    scope: ctx.scope,
                    template: ctx.template
                }, ...ctx.providers);
            } else {
                ctx.value = await this.container.get(BuilderServiceToken).buildBootTarget({
                    module: selector,
                    scope: ctx.scope,
                    template: ctx.template,
                    regFor: RegFor.boot,
                    providers: ctx.providers
                });
            }
        }
        if (isNullOrUndefined(ctx.value)) {
            await next();
        }
    }
}
