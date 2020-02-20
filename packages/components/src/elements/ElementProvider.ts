import { Singleton, Type, ClassType } from '@tsdi/ioc';
import { ComponentProvider } from '../ComponentProvider';
import { ElementNode } from './ElementNode';
import { ElementRef, IElementRef, IComponentRef, ComponentRef } from '../ComponentRef';
import { IAnnoationContext } from '@tsdi/boot';
import { TemplateContext } from '../parses/TemplateContext';
import { ICoreInjector } from '@tsdi/core';
import { ITemplateOption, ITemplateContext } from '../parses/TemplateContext';

/**
 * ref element selector.
 *
 * @export
 * @class RefElementSelector
 * @extends {ComponentProvider}
 */
@Singleton()
export class ElementProvider extends ComponentProvider {
    isElementRef(target: any): target is IElementRef {
        return target instanceof ElementRef;
    }
    isComponentRef(target: any): target is IComponentRef {
        return target instanceof ComponentRef;
    }

    isElementRefType(target: ClassType): boolean {
        return target === ElementRef;
    }

    isComponentRefType(target: ClassType): boolean {
        return target === ComponentRef;
    }

    isElementType(element: ClassType): boolean {
        return this.reflects.isExtends(element, ElementNode);
    }

    isTemplateContext(context: IAnnoationContext): boolean {
        return context instanceof TemplateContext;
    }

    createTemplateContext(injector: ICoreInjector, options?: ITemplateOption): ITemplateContext {
        return TemplateContext.parse(injector, options);
    }

    getDefaultCompose(): Type<any> {
        return ElementNode;
    }
    getSelectorKey(): string {
        return 'element';
    }
    getRefSelectKey(): string {
        return 'selector';
    }
}
