import { Type } from '@tsdi/ioc';
import { IAnnoationReflect } from '@tsdi/boot';

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
     * directive selector.
     */
    selector?: string;
}

