import { ITypeReflect } from '@tsdi/ioc';
import { IBinding, IPropertyVaildate } from './IBinding';

/**
 * binding type reflect data.
 *
 * @export
 * @interface IBindingTypeReflect
 * @extends {ITypeReflect}
 */
export interface IBindingTypeReflect extends ITypeReflect {

    /**
     * component decorator.
     */
    componentDecorator?: string;
    /**
     * component selector.
     */
    componentSelector?: string;
    /**
     * component select key.
     */
    selectKey?: string;
    attrSelector?: string;
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
