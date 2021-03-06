import { tokenId, TokenId } from '@tsdi/ioc';
import { IAnnoationReflect } from '@tsdi/boot';
import { IBinding } from './bindings/IBinding';

/**
 * default components.
 */
export const DefaultComponets: TokenId<string[]> = tokenId<string[]>('DefaultComponets');

/**
 * binding type reflect data.
 *
 * @export
 * @interface IBindingTypeReflect
 * @extends {ITypeReflect}
 */
export interface IComponentReflect extends IAnnoationReflect {
    /**
     * the type is component or not.
     */
    component?: boolean;
    /**
     * component compiled def.
     */
    componentDef?: any;

    /**
     * get bindings.
     * @param decor decorator
     */
    getBindings?<T = IBinding>(decor: string): Map<string, T>;

    // todo: will remove.
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

}
