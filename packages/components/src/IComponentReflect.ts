import { tokenId, Type } from '@tsdi/ioc';
import { IAnnoationReflect } from '@tsdi/boot';
import { IBinding } from './bindings/IBinding';

export interface IComponentDef {
    expression: any;
    type: Type;
}



/**
 * component reflect data.
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
    componentDef?: IComponentDef;

    /**
     * get bindings.
     * @param decor decorator
     */
    getBindings?<T = IBinding>(decor: string): Map<string, T>;

    /**
     * component selector.
     */
    selector?: string;

}
