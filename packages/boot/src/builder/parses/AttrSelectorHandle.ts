import { ParseHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { SelectorManager } from '../../core';
import { isString, isClass, isNullOrUndefined } from '@tsdi/ioc';

export class AttrSelectorHandle extends ParseHandle {

    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {

        if (ctx.binding && !isNullOrUndefined(ctx.template)) {
            let mgr = this.container.get(SelectorManager);
            let pdr = ctx.binding.provider;
            if (isString(pdr) && mgr.hasAttr(pdr)) {
                ctx.selector = mgr.getAttr(pdr);
            } else if (isClass(ctx.binding.provider) && mgr.has(ctx.binding.provider)) {
                ctx.selector = ctx.binding.provider;
            } else if (isClass(ctx.binding.type) && mgr.has(ctx.binding.type)) {
                ctx.selector = ctx.binding.type;
            }
        }

        if (!ctx.selector) {
            await next();
        }
    }
}
