import { Type, TypeReflect } from '@tsdi/ioc';
import { BootstrapMetadata } from '../decorators';

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
    moduleDecorator?: string;
    /**
     * module metadata.
     */
    moduleMetadata?: BootstrapMetadata;

}
