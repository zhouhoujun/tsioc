import { isString, Type, isArray, DecoratorProvider, Token } from '@tsdi/ioc';
import { RefSelector } from '../../RefSelector';
import { TemplateHandle } from '../../parses/TemplateHandle';
import { TemplateContext } from '../../parses/TemplateContext';
import { CTX_TEMPLATE } from '@tsdi/boot';

/**
 * component selector handle.
 *
 * @export
 * @class ComponentSelectorHandle
 * @extends {TemplateHandle}
 */
export class ComponentSelectorHandle extends TemplateHandle {
    async execute(ctx: TemplateContext, next: () => Promise<void>): Promise<void> {
        let refSelector = this.actInjector.getInstance(DecoratorProvider).resolve(ctx.componentDecorator, RefSelector);
        let template = ctx.template;
        if (isArray(template) && ctx.annoation.template === template) {
            ctx.selector = refSelector.getDefaultCompose();
        } else if (refSelector.isNodeType(template)) {
            ctx.selector = template;
            ctx.remove(CTX_TEMPLATE);
        } else if (template) {
            ctx.selector = this.getComponent(ctx, template, refSelector);
        }

        if (!ctx.selector) {
            await next();
        }
    }

    protected getSelector(template: any, refSelector?: RefSelector): any {
        return template ? template[refSelector.getSelectorKey()] : null
    }

    protected getSelectorToken(refSelector: RefSelector, selector: string): Token {
        return refSelector.toSelectorToken(selector);
    }

    protected getComponent(ctx: TemplateContext, template: any, refSelector: RefSelector): Type {
        let selector = this.getSelector(template, refSelector);
        if (selector) {
            if (isString(selector)) {
                let selkey = this.getSelectorToken(refSelector, selector);
                return ctx.injector.getTokenProvider(selkey);
            } else if (refSelector.isNodeType(selector)) {
                return selector;
            }
        }
        return null;
    }
}
