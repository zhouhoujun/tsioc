import { Token, ClassMetadata } from '@ts-ioc/core';
import { IAnnotationBuilder } from './IAnnotationBuilder';

/**
 * type build config.
 *
 * @export
 * @interface TypeConfigure
 * @template T
 */
export interface AnnotationConfigure<T> extends ClassMetadata {
    /**
     * autorun.
     *
     * @type {string}
     * @memberof AnnotationConfigure
     */
    autorun?: string;

    /**
     * annotation for the type.
     *
     * @type {Token<any>}
     * @memberof AnnotationConfigure
     */
    token?: Token<any>;

    /**
     * annotation builder.
     *
     * @type {(Token<IAnnotationBuilder<T>> | IAnnotationBuilder<T>)}
     * @memberof AnnotationConfigure
     */
    annoBuilder?: Token<IAnnotationBuilder<T>> | IAnnotationBuilder<T>;
}
