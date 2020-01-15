import { Singleton, Type } from '@tsdi/ioc';
import { ComponentProvider } from '../ComponentProvider';
import { ElementNode } from './ElementNode';

/**
 * ref element selector.
 *
 * @export
 * @class RefElementSelector
 * @extends {ComponentProvider}
 */
@Singleton()
export class ElementProvider extends ComponentProvider {

    isElementType(element: any): boolean {
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
