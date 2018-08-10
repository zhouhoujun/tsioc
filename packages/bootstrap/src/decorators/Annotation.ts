import { ClassMetadata, ITypeDecorator, Token, MetadataAdapter, MetadataExtends, createClassDecorator } from '@ts-ioc/core';
import { IAnnotationBuilder } from '../IAnnotationBuilder';
import { AnnotationConfigure } from '../AnnotationConfigure';

export interface BuildMetadata extends ClassMetadata, AnnotationConfigure<any> {

}

/**
 * Annotation decorator, use to define class build way via config.
 *
 * @export
 * @interface IAnnotationDecorator
 * @extends {ITypeDecorator<T>}
 * @template T
 */
export interface IAnnotationDecorator<T extends BuildMetadata> extends ITypeDecorator<T> {
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
export function createAnnotationDecorator<T extends BuildMetadata>(
    name: string,
    builder?: Token<IAnnotationBuilder<any>> | IAnnotationBuilder<any>,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IAnnotationDecorator<T> {

    return createClassDecorator<BuildMetadata>(name,
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
export const Annotation: IAnnotationDecorator<BuildMetadata> = createAnnotationDecorator<BuildMetadata>('Annotation');
