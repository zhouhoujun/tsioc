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
        let template = ctx.getTemplate();
        if (isArray(template) && ctx.getAnnoation().template === template) {
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

    protected getSelector(template: any, compdr?: ComponentProvider): any {
        return template ? template[compdr.getSelectorKey()] : null
    }

    protected getSelectorToken(compdr: ComponentProvider, selector: string): Token {
        return compdr.toSelectorToken(selector);
    }

    protected getComponent(ctx: ITemplateContext, template: any, compdr: ComponentProvider): Type {
        let selector = this.getSelector(template, compdr);
        if (selector) {
            if (isString(selector)) {
                let selkey = this.getSelectorToken(compdr, selector);
                return ctx.injector.getTokenProvider(selkey);
            } else if (compdr.isNodeType(selector)) {
                return selector;
            }
        }
        return null;
    }
}
