import { Type } from '@tsdi/ioc';
import { IAnnoationReflect } from '@tsdi/boot';
import { IBinding } from './bindings/IBinding';

export interface IDirectiveDef {
    expression: any;
    type: Type;
}

/**
 * directive reflect data.
 *
 * @export
 * @interface IBindingTypeReflect
 * @extends {ITypeReflect}
 */
export interface IDirectiveReflect extends IAnnoationReflect  {

    /**
     * directive flag.
     */
    directive?: boolean;

    /**
     * directive compiled def.
     */
    directiveDef?: IDirectiveDef;

    /**
     * get bindings.
     * @param decor decorator
     */
    getBindings?<T = IBinding>(decor: string): Map<string, T>;

    /**
     * directive selector.
     */
    selector?: string;
}

