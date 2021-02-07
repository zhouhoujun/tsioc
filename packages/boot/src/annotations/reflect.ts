import { ClassMetadata, RegInMetadata, Token, ClassType, TypeReflect, ProvidersMetadata } from '@tsdi/ioc';

/**
 * annotation metadata.
 *
 * @export
 * @interface IAnnotationMetadata
 * @extends {ClassMetadata}
 * @template T
 */
export interface AnnotationMetadata<T = any> extends ClassMetadata, ProvidersMetadata, RegInMetadata {
    /**
     * annotation for the type.
     *
     * @type {Token<T>}
     */
    token?: Token<T>;
    /**
     * Annotation class Type.
     *
     * @type {Type<T>}
     */
    type?: ClassType<T>;

}

/**
 * annotation type.
 */
export type AnnotationTypes = 'module' | 'component' | 'decorator' | 'directive' | 'pipe' | 'boot' | 'suite';

/**
 * AnnotationReflect
 */
export interface AnnotationReflect extends TypeReflect {
    /**
     * the type of annoation.
     */
    annoType?: AnnotationTypes;
    /**
     * annoation decorator.
     */
    annoDecor?: string;
    /**
     * annotation metadata.
     */
    annotation?: AnnotationMetadata;

}

