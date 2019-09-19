import { Abstract, Type, isClass, hasOwnClassMetadata } from '@tsdi/ioc';


/**
 * ref element identfy selector.
 *
 * @export
 * @abstract
 * @class RefIdentfy
 */
@Abstract()
export abstract class RefSelector {

    abstract getComponentSelector(): string;

    abstract getSelectorId(): string;
    /**
     * select ref tag in element.
     *
     * @abstract
     * @param {*} element
     * @param {string} selector
     * @returns {*}
     * @memberof RefSelector
     */
    abstract select(element: any, selector: string): any;

    isComponentType(decorator: string, element: any): boolean {
        return isClass(element) && hasOwnClassMetadata(decorator, element);
    }

    abstract getDefaultCompose(): Type;
}

