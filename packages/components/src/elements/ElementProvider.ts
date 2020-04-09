import { Singleton, Type, ClassType } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { IAnnoationContext } from '@tsdi/boot';
import { ComponentProvider } from '../ComponentProvider';
import { ElementNode } from './ElementNode';
import { ElementRef, IElementRef, IComponentRef, ComponentRef } from '../ComponentRef';
import { TemplateContext } from '../compile/TemplateContext';
import { ITemplateOption, ITemplateContext } from '../compile/TemplateContext';

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
        return element?.d0CT === 'directive';
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
