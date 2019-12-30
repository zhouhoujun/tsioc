import { Singleton, Type } from '@tsdi/ioc';
import { RefSelector } from '../RefSelector';
import { ElementNode } from './ElementNode';

/**
 * ref element selector.
 *
 * @export
 * @class RefElementSelector
 * @extends {RefSelector}
 */
@Singleton()
export class RefElementSelector extends RefSelector {

    isComponentType(element: any): boolean {
        return super.isComponentType(element) || this.reflects.isExtends(element, ElementNode);
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
