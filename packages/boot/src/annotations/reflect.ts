import { ClassMetadata, RegInMetadata, Token, ClassType, IProvider, TypeReflect } from '@tsdi/ioc';


/**
 * annotation metadata.
 *
 * @export
 * @interface IAnnotationMetadata
 * @extends {ClassMetadata}
 * @template T
 */
export interface IAnnotationMetadata<T = any> extends ClassMetadata, RegInMetadata {
    /**
     * annotation for the type.
     *
     * @type {Token<T>}
     * @memberof AnnotationConfigure
     */
    token?: Token<T>;
    /**
     * Annotation class Type.
     *
     * @type {Type<T>}
     * @memberof IAnnotationMetadata
     */
    type?: ClassType<T>;

}

export interface IAnnoationReflect extends TypeReflect {

    annoDecor?: string;

    annoMetadata?: IAnnotationMetadata;
}
