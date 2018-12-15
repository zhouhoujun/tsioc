import { Token, IAnnotationMetadata, IMetaAccessor } from '@ts-ioc/core';
import { IAnnotationBuilder } from './IAnnotationBuilder';
import { Runnable } from '../runnable';

/**
 * type build config.
 *
 * @export
 * @interface TypeConfigure
 * @template T
 */
export interface AnnotationConfigure<T> extends IAnnotationMetadata<T> {

    /**
     * annotation builder.
     *
     * @type {(Token<IAnnotationBuilder<T>> | IAnnotationBuilder<T>)}
     * @memberof AnnotationConfigure
     */
    annoBuilder?: Token<IAnnotationBuilder<T>> | IAnnotationBuilder<T>;

    /**
     * default runnable.
     *
     * @type {Token<Runnable<T>>}
     * @memberof AnnotationConfigure
     */
    defaultRunnable?: Token<Runnable<T>>;

    /**
     * default annotation builder token.
     *
     * @type {Token<IAnnotationBuilder<T>>}
     * @memberof AnnotationConfigure
     */
    defaultAnnoBuilder?: Token<IAnnotationBuilder<T>>;
    /**
     * default metadata accessor.
     *
     * @type {Token<IMetaAccessor<T>>}
     * @memberof AnnotationConfigure
     */
    defaultMetaAccessor?: Token<IMetaAccessor<T>>;
}
