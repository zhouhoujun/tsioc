import { CompositeParserHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { isNullOrUndefined } from '@tsdi/ioc';
import { BuilderService } from '../../services';
import { RegScope } from '../../core';

export class SelectorParseHandle extends CompositeParserHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
        if (isNullOrUndefined(ctx.bindingValue)) {
            let selector = ctx.selector;
            if (selector) {
                let container = ctx.getRaiseContainer();
                if (container.has(selector)) {
                    ctx.bindingValue = await this.container.get(BuilderService).resolve(selector, { template: ctx.template, providers: ctx.providers });
                } else {
                    ctx.bindingValue = await this.container.get(BuilderService).create({ module: selector, template: ctx.template, regScope: RegScope.boot, providers: ctx.providers });
                }
            }
        }
        if (isNullOrUndefined(ctx.bindingValue)) {
            await next();
        }
    }
}
