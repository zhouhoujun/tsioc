import { ParseHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { SelectorManager } from '../../core';
import { isString } from '@tsdi/ioc';

export class AttrSelectorHandle extends ParseHandle {

    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
        let mgr = this.container.get(SelectorManager);
        let pdr = ctx.binding.provider;
        if (isString(pdr) && mgr.hasAttr(pdr)) {
            ctx.selector = mgr.getAttr(pdr);
        } else if (mgr.hasAttr(ctx.binding.name)) {
            ctx.selector = mgr.getAttr(ctx.binding.name);
        }

        if (!ctx.selector) {
            await next();
        }
    }
}
