import { IAnnoationReflect } from '@tsdi/boot';

export interface IDirectiveReflect extends IAnnoationReflect  {

    /**
     * directive flag.
     */
    directive?: boolean;

    /**
     * directive compiled def.
     */
    directiveDef: any;
}

