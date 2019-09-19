import { RefSelector } from '../RefSelector';
import { Injectable, Type, lang } from '@tsdi/ioc';
import { CompositeNode } from './CompositeNode';
import { ElementNode } from './ElementNode';

/**
 * ref element selector.
 *
 * @export
 * @class RefElementSelector
 * @extends {RefSelector}
 */
@Injectable()
export class RefElementSelector extends RefSelector {
    isComponentType(decorator: string, element: any): boolean {
        return super.isComponentType(decorator, element) || lang.isExtendsClass(element, ElementNode);
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
    select(element: any, selector: string): any {
        if (element instanceof CompositeNode) {
            return element.getSelector()
                .find(e => e.selector === selector)
        }
        if (element.selector === selector) {
            return element;
        }
        return null;
    }
}
