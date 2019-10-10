import { isString, Type, isArray, DecoratorProvider } from '@tsdi/ioc';
import { TemplateHandle, TemplateContext } from '../../parses';
import { SelectorManager } from '../../SelectorManager';
import { RefSelector } from '../../RefSelector';

/**
 * component selector handle.
 *
 * @export
 * @class ComponentSelectorHandle
 * @extends {TemplateHandle}
 */
export class ComponentSelectorHandle extends TemplateHandle {
    async execute(ctx: TemplateContext, next: () => Promise<void>): Promise<void> {
        let refSelector = ctx.getRaiseContainer().get(DecoratorProvider).resolve(ctx.decorator, RefSelector);
        if (isArray(ctx.template) && ctx.annoation.template === ctx.template) {
            ctx.selector = refSelector.getDefaultCompose();
        } else if (refSelector.isComponentType(ctx.decorator, ctx.template)) {
            ctx.selector = ctx.template;
            ctx.template = null;
        } else if (ctx.template) {
            ctx.selector = this.getComponent(ctx, ctx.template, refSelector);
        }

        if (!ctx.selector) {
            await next();
        }
    }

    protected getSelector(template: any, refSelector?: RefSelector): any {
        return template ? template[refSelector.getComponentSelector()] : null
    }

    protected getComponent(ctx: TemplateContext, template: any, refSelector: RefSelector): Type {
        let selector = this.getSelector(template, refSelector);
        if (selector) {
            let mgr = ctx.getRaiseContainer().resolve(SelectorManager);
            if (isString(selector) && mgr.has(selector)) {
                return mgr.get(selector);
            } else if (refSelector.isComponentType(ctx.decorator, selector)) {
                return selector;
            }
        }
        return null;
    }
}
