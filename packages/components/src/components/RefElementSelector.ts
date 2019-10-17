import { RefSelector } from '../RefSelector';
import { Singleton, Type } from '@tsdi/ioc';
import { CompositeNode } from './CompositeNode';
import { ElementNode } from './ElementNode';
import { NodeSelector } from '../ComponentManager';

/**
 * ref element selector.
 *
 * @export
 * @class RefElementSelector
 * @extends {RefSelector}
 */
@Singleton()
export class RefElementSelector extends RefSelector {
    isComponentType(decorator: string, element: any): boolean {
        return super.isComponentType(decorator, element) || this.reflects.isExtends(element, ElementNode);
    }
    getDefaultCompose(): Type<any> {
        return ElementNode;
    }
    getComponentSelector(): string {
        return 'element';
    }
    getSelectorId(): string {
        return 'selector';
    }

    createNodeSelector(element): NodeSelector {
        if (element instanceof CompositeNode) {
            return element.getSelector();
        }
        return null;
    }
}
