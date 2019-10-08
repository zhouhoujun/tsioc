import { Abstract, Type, isClass, isString, TypeReflects, Inject } from '@tsdi/ioc';
import { NodeSelector } from './ComponentManager';
import { IContainer, ContainerToken } from '@tsdi/core';


/**
 * ref element identfy selector.
 *
 * @export
 * @abstract
 * @class RefIdentfy
 */
@Abstract()
export abstract class RefSelector {

    @Inject(ContainerToken) protected container: IContainer;

    abstract getComponentSelector(): string;

    abstract getSelectorId(): string;

    abstract getDefaultCompose(): Type;

    abstract createNodeSelector(element): NodeSelector;

    /**
     * select ref tag in element.
     *
     * @param {*} element
     * @param {(string | ((e: any) => boolean))} selector
     * @returns {*}
     * @memberof RefSelector
     */
    select(element: any, selector: string | ((e: any) => boolean)): any {
        let selFunc: (e: any) => boolean;
        if (isString(selector)) {
            let id = this.getSelectorId();
            selFunc = e => e[id] === selector;
        } else {
            selFunc = selector;
        }
        if (selFunc(element)) {
            return element;
        }
        let cmpSelector = this.createNodeSelector(element);
        if (cmpSelector) {
            return cmpSelector.find(e => selFunc(e));
        }
        return null;
    }

    isComponentType(decorator: string, element: any): boolean {
        return isClass(element) && this.container.getTypeReflects().hasMetadata(decorator, element);
    }

}

