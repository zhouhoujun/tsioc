import { ITypeReflect, tokenId, IProviders } from '@tsdi/ioc';
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
     * directive.
     */
    directive?: boolean;
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
     * get decorator providers.
     */
    getDecorProviders?(): IProviders;

    /**
     * get bindings.
     * @param decor decorator
     */
    getBindings?<T = IBinding>(decor: string): Map<string, T>;

}
