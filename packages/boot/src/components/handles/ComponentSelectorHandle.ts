import { SelectorManager } from '../../core';
import { TemplateHandle, TemplateContext } from '../../builder';
import { isString, isClass, hasOwnClassMetadata, lang, Type, isMetadataObject, isArray } from '@tsdi/ioc';
import { ContentElement } from '../ContentElement';
import { Element } from '../Element';


export class ComponentSelectorHandle extends TemplateHandle {
    async execute(ctx: TemplateContext, next: () => Promise<void>): Promise<void> {
        if (isArray(ctx.template) && ctx.annoation.template === ctx.template) {
            ctx.selector = ContentElement;
        } else if (this.isElement(ctx.decorator, ctx.template)) {
            ctx.selector = ctx.template;
            ctx.template = null;
        } else if (isMetadataObject(ctx.template) && ctx.template.element) {
            let mgr = this.container.get(SelectorManager);
            let element = ctx.template.element;
            if (isString(element) && mgr.has(element)) {
                ctx.selector = mgr.get(element);
            } else if (this.isElement(ctx.decorator, element)) {
                ctx.selector = element;
            }
        }

        if (!ctx.selector) {
            await next();
        }
    }

    isElement(decorator: string, element: any): element is Type<Element> {
        return isClass(element) && (hasOwnClassMetadata(decorator, element) || lang.isExtendsClass(element, Element));
    }
}
