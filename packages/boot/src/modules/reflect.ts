import { Type, TypeReflect } from '@tsdi/ioc';
import { IModuleMetadata } from './configure';

export interface ModuleReflect extends TypeReflect {
    /**
     *  components of current module.
     */
    components?: Type[];
    /**
     * dectors of components.
     */
    componentDectors?: string[];

    /**
     * module decorator.
     */
    decorator?: string;
    /**
     * module metadata.
     */
    moduleMetadata?: IModuleMetadata;

}
