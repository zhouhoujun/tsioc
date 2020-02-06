import { Singleton, Type, ClassType } from '@tsdi/ioc';
import { ComponentProvider } from '../ComponentProvider';
import { ElementNode } from './ElementNode';
import { ElementRef, IElementRef, IComponentRef, ComponentRef } from '../ComponentRef';

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
