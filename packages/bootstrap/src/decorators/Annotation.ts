import { ITypeDecorator, Token, MetadataAdapter, MetadataExtends, createClassDecorator } from '@ts-ioc/core';
import { IAnnotationBuilder } from '../annotations/IAnnotationBuilder';
import { AnnotationConfigure } from '../annotations/AnnotationConfigure';

export interface AnnotationMetadata extends AnnotationConfigure<any> {

}

/**
 * Annotation decorator, use to define class build way via config.
 *
 * @export
 * @interface IAnnotationDecorator
 * @extends {ITypeDecorator<T>}
 * @template T
 */
export interface IAnnotationDecorator<T extends AnnotationMetadata> extends ITypeDecorator<T> {
    /**
     * Annotation decorator, use to define class as DI Module.
     *
     * @Build
     *
     * @param {T} [metadata] bootstrap metadate config.
     */
    (metadata: T): ClassDecorator;
}

/**
 * create type builder decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @param {string} [decorType]
 * @param {(Token<IAnnotationBuilder<any>> | IAnnotationBuilder<any>)} [builder]
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IAnnotationDecorator<T>}
 */
export function createAnnotationDecorator<T extends AnnotationMetadata>(
    name: string,
    builder?: Token<IAnnotationBuilder<any>> | IAnnotationBuilder<any>,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IAnnotationDecorator<T> {

    return createClassDecorator<AnnotationMetadata>(name,
        args => {
            if (adapter) {
                adapter(args);
            }
        },
        metadata => {
            if (metadataExtends) {
                metadata = metadataExtends(metadata as T);
            }

            if (builder && !metadata.annotationBuilder) {
                metadata.annotationBuilder = builder;
            }
            return metadata;
        }) as IAnnotationDecorator<T>;
}


/**
 * Annotation decorator, use to define class build way via config.
 *
 * @Annotation
 */
export const Annotation: IAnnotationDecorator<AnnotationMetadata> = createAnnotationDecorator<AnnotationMetadata>('Annotation');
