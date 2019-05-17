import { ParsersHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { isNullOrUndefined } from '@tsdi/ioc';
import { BuilderService } from '../BuilderService';
import { RegScope } from '../../core';

export class ParseSelectorHandle extends ParsersHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
        if (ctx.selector) {
            let selector = ctx.selector;
            let container = ctx.getRaiseContainer();
            if (container.has(selector)) {
                ctx.value = await this.container.get(BuilderService).resolve(selector, {
                    scope: ctx.scope,
                    template: ctx.template,
                    providers: ctx.providers
                });
            } else {
                ctx.value = await this.container.get(BuilderService).createBoot({
                    module: selector,
                    scope: ctx.scope,
                    template: ctx.template,
                    regScope: RegScope.boot, providers: ctx.providers
                });
            }
            console.log(selector, ctx.type, ctx.value);
        }
        if (isNullOrUndefined(ctx.value)) {
            await next();
        }
    }
}
