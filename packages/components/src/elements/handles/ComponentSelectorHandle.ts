import { isString, Type, isArray, DecoratorProvider } from '@tsdi/ioc';
import { RefSelector } from '../../RefSelector';
import { TemplateHandle } from '../../parses/TemplateHandle';
import { TemplateContext } from '../../parses/TemplateContext';

/**
 * component selector handle.
 *
 * @export
 * @class ComponentSelectorHandle
 * @extends {TemplateHandle}
 */
export class ComponentSelectorHandle extends TemplateHandle {
    async execute(ctx: TemplateContext, next: () => Promise<void>): Promise<void> {
        let refSelector = this.actInjector.getInstance(DecoratorProvider).resolve(ctx.decorator, RefSelector);
        let options = ctx.getOptions();
        if (isArray(options.template) && ctx.annoation.template === options.template) {
            ctx.selector = refSelector.getDefaultCompose();
        } else if (refSelector.isComponentType(ctx.decorator, options.template)) {
            ctx.selector = options.template;
            options.template = null;
        } else if (options.template) {
            ctx.selector = this.getComponent(ctx, options.template, refSelector);
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
            let mgr = ctx.getContainer().resolve(SelectorManager);
            if (isString(selector) && mgr.has(selector)) {
                return mgr.get(selector);
            } else if (refSelector.isComponentType(ctx.decorator, selector)) {
                return selector;
            }
        }
        return null;
    }
}
