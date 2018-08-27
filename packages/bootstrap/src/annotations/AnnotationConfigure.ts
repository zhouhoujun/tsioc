import { Token, IAnnotationMetadata } from '@ts-ioc/core';
import { IAnnotationBuilder } from './IAnnotationBuilder';

/**
 * type build config.
 *
 * @export
 * @interface TypeConfigure
 * @template T
 */
export interface AnnotationConfigure<T> extends IAnnotationMetadata<T> {
    /**
     * autorun.
     *
     * @type {string}
     * @memberof AnnotationConfigure
     */
    autorun?: string;

    /**
     * annotation builder.
     *
     * @type {(Token<IAnnotationBuilder<T>> | IAnnotationBuilder<T>)}
     * @memberof AnnotationConfigure
     */
    annotationBuilder?: Token<IAnnotationBuilder<T>> | IAnnotationBuilder<T>;
}
