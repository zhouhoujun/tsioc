import { Type } from '@tsdi/ioc';
import { AnnotationReflect } from '../annotations/reflect';
import { DIModuleMetadata } from '../decorators';

/**
 * di module relfect.
 */
export interface ModuleReflect<T = any> extends AnnotationReflect<T> {
 
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
    annotation?: DIModuleMetadata;

}
