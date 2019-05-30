import { ParsersHandle } from './ParseHandle';
import { TemplateContext } from './TemplateContext';
import { isNullOrUndefined } from '@tsdi/ioc';
import { BuilderServiceToken } from '../IBuilderService';
import { RegFor } from '../../core';

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
                ctx.value = await this.container.get(BuilderServiceToken).createBoot({
                    module: selector,
                    scope: ctx.scope,
                    template: ctx.template,
                    regScope: RegFor.boot,
                    providers: ctx.providers
                });
            }
        }
        if (isNullOrUndefined(ctx.value)) {
            await next();
        }
    }
}
