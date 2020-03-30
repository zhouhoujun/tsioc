import { IAnnoationReflect } from '@tsdi/boot';
import { IBinding } from './bindings/IBinding';

export interface IDirectiveReflect extends IAnnoationReflect  {

    /**
     * directive flag.
     */
    directive?: boolean;

    /**
     * directive compiled def.
     */
    directiveDef: any;

    /**
     * get bindings.
     * @param decor decorator
     */
    getBindings?<T = IBinding>(decor: string): Map<string, T>;
}

