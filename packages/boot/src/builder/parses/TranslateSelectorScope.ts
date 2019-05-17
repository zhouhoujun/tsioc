import { ParsersHandle, ParseHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { isNullOrUndefined, isString, isClass } from '@tsdi/ioc';
import { SelectorManager } from '../../core';
import { TemplateDecoratorRegisterer } from './TemplateDecoratorRegisterer';

export class TranslateSelectorScope extends ParsersHandle {
    async execute(ctx: ParseContext, next?: () => Promise<void>): Promise<void> {
        await super.execute(ctx);
        if (next) {
            await next();
        }
    }
    setup() {
        this.container.register(TemplateDecoratorRegisterer);
        this.use(TranslateTemplateHandle)
            .use(TranslateAttrSelectorHandle);
    }
}

export class TranslateTemplateHandle extends ParseHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
        if (!ctx.binding) {
            let reg = this.container.get(TemplateDecoratorRegisterer);
            if (reg.has(ctx.decorator)) {
                await this.execFuncs(ctx, reg.getFuncs(this.container, ctx.decorator));
            }
        }
        if (!ctx.selector) {
            await next();
        }
    }
}



export class TranslateAttrSelectorHandle extends ParseHandle {

    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {

        if (ctx.binding && !isNullOrUndefined(ctx.bindExpression)) {
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

