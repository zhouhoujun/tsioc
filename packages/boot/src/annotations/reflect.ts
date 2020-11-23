import { ITypeReflect, ClassMetadata, RegInMetadata, Token, ClassType, IProvider } from '@tsdi/ioc';


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

export interface IAnnoationReflect extends ITypeReflect {

    /**
     * get decorator providers.
     */
    getDecorProviders?(): IProvider;

     /**
     * get annoation.
     *
     * @template T
     * @param {boolean} [clone] default true.
     * @returns {T}
     * @memberof IModuleReflect
     */
    getAnnoation?<T extends IAnnotationMetadata>(clone?: boolean): T;
}
