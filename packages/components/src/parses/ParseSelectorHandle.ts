import { ParsersHandle } from './ParseHandle';
import { TemplateContext } from './TemplateContext';
import { isNullOrUndefined } from '@tsdi/ioc';
import { BuilderServiceToken } from '@tsdi/boot';


export class ParseSelectorHandle extends ParsersHandle {
    async execute(ctx: TemplateContext, next: () => Promise<void>): Promise<void> {
        if (ctx.selector) {
            let selector = ctx.selector;
            let container = ctx.getRaiseContainer();
            ctx.value = await this.container
                .resolve(BuilderServiceToken)
                .resolve(selector, {
                    scope: ctx.scope,
                    template: ctx.template,
                    raiseContainer: container.getFactory()
                }, ...ctx.providers);
        }
        if (isNullOrUndefined(ctx.value)) {
            await next();
        }
    }
}
