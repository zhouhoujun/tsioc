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
