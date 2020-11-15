import { Type } from '@tsdi/ioc';
import { AnnotationReflect } from '../annotations/reflect';
import { BootstrapMetadata } from '../decorators';

/**
 * di module relfect.
 */
export interface ModuleReflect extends AnnotationReflect {
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
    annoDecor?: string;
    /**
     * module metadata.
     */
    annotation?: BootstrapMetadata;

}
