import { ITypeReflect, tokenId } from '@tsdi/ioc';
import { IBinding, IPropertyVaildate } from './bindings/IBinding';

/**
 * default components.
 */
export const DefaultComponets = tokenId<string[]>('DefaultComponets');

/**
 * binding type reflect data.
 *
 * @export
 * @interface IBindingTypeReflect
 * @extends {ITypeReflect}
 */
export interface IComponentReflect extends ITypeReflect {
    /**
     * the type is component or not.
     */
    component?: boolean;
    /**
     * component selector.
     */
    selector?: string;
    /**
     * attr selector.
     */
    attrSelector?: string;
    /**
     * component select key.
     */
    selectKey?: string;
    /**
     * property input binding metadata.
     *
     * @type {Map<string, IBinding>}
     * @memberof IBindingTypeReflect
     */
    propInBindings: Map<string, IBinding>;

    /**
     * property output binding metadata.
     *
     * @type {Map<string, IBinding>}
     * @memberof IBindingTypeReflect
     */
    propOutBindings: Map<string, IBinding>;

    /**
     * property output binding metadata.
     *
     * @type {Map<string, IBinding>}
     * @memberof IBindingTypeReflect
     */
    propRefChildBindings: Map<string, IBinding>;

    /**
     * property vaildate metadata.
     *
     * @type {Map<string, IPropertyVaildate>}
     * @memberof IBindingTypeReflect
     */
    propVaildates: Map<string, IPropertyVaildate[]>;

}
