import { Token } from '@ts-ioc/core';
import { IAnnotationBuilder } from './IAnnotationBuilder';

/**
 * type build config.
 *
 * @export
 * @interface TypeConfigure
 * @template T
 */
export interface AnnotationConfigure<T> {
    /**
     * autorun.
     *
     * @type {string}
     * @memberof AnnotationConfigure
     */
    autorun?: string;
    /**
     * bootstrap via configed token.
     *
     * @type {Token<T>}
     * @memberof AnnotationConfigure
     */
    bootstrap?: Token<T>;

    /**
     * type builder.
     *
     * @type {(Token<IAnnotationBuilder<T>> | IAnnotationBuilder<T>)}
     * @memberof AnnotationConfigure
     */
    annotationBuilder?: Token<IAnnotationBuilder<T>> | IAnnotationBuilder<T>;
}
