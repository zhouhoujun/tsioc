import { isString, Type, isArray, Token } from '@tsdi/ioc';
import { CTX_TEMPLATE, BuildHandle } from '@tsdi/boot';
import { ComponentProvider } from '../../ComponentProvider';
import { ITemplateContext } from '../../parses/TemplateContext';

/**
 * component selector handle.
 *
 * @export
 * @class ComponentSelectorHandle
 * @extends {TemplateHandle}
 */
export class ComponentSelectorHandle extends BuildHandle<ITemplateContext> {
    async execute(ctx: ITemplateContext, next: () => Promise<void>): Promise<void> {
        let compPdr = ctx.componentProvider;
        let template = ctx.template;
        if (isArray(template) && ctx.annoation.template === template) {
            ctx.selector = compPdr.getDefaultCompose();
        } else if (compPdr.isNodeType(template)) {
            ctx.selector = template;
            ctx.remove(CTX_TEMPLATE);
        } else if (template) {
            ctx.selector = this.getComponent(ctx, template, compPdr);
        }

        if (!ctx.selector) {
            await next();
        }
    }

    protected getSelector(template: any, refSelector?: ComponentProvider): any {
        return template ? template[refSelector.getSelectorKey()] : null
    }

    protected getSelectorToken(refSelector: ComponentProvider, selector: string): Token {
        return refSelector.toSelectorToken(selector);
    }

    protected getComponent(ctx: ITemplateContext, template: any, refSelector: ComponentProvider): Type {
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
