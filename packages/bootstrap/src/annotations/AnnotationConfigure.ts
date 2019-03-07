import { IAnnotationMetadata, MetaAccessor } from '../services';
import { IAnnotationBuilder } from './IAnnotationBuilder';
import { Runnable } from '../runnable';
import { Token } from '@ts-ioc/ioc';

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
     * @type {Token<MetaAccessor>}
     * @memberof AnnotationConfigure
     */
    defaultMetaAccessor?: Token<MetaAccessor>;
}
