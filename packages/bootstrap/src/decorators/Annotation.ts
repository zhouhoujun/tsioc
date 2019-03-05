import { ITypeDecorator, Token, MetadataAdapter, MetadataExtends, createClassDecorator, isToken } from '@ts-ioc/ioc';
import { IAnnotationBuilder, AnnotationBuilderToken } from '../annotations/IAnnotationBuilder';
import { AnnotationConfigure } from '../annotations/AnnotationConfigure';

/**
 * annotation metadata.
 *
 * @export
 * @interface AnnotationMetadata
 * @extends {AnnotationConfigure<any>}
 */
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
 * @param {(Token<IAnnotationBuilder<any>> | IAnnotationBuilder<any>)} [defaultBuilder]
 * @param {defaultBoot?: Token<any> | ((metadata: T) => Token<any>)} [defaultBoot]
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IAnnotationDecorator<T>}
 */
export function createAnnotationDecorator<T extends AnnotationMetadata>(
    name: string,
    defaultBuilder?: Token<IAnnotationBuilder<any>>,
    defaultBoot?: Token<any> | ((metadata: T) => Token<any>),
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
                metadataExtends(metadata as T);
            }

            if (defaultBuilder && !metadata.defaultAnnoBuilder) {
                metadata.defaultAnnoBuilder = defaultBuilder;
            }
            if (!metadata.bootstrap && defaultBoot) {
                let defboot = isToken(defaultBoot) ? defaultBoot : defaultBoot(metadata as T);
                if (defboot) {
                    metadata.bootstrap = defboot;
                }
            }
            return metadata;
        }) as IAnnotationDecorator<T>;
}


/**
 * Annotation decorator, use to define class build way via config.
 *
 * @Annotation
 */
export const Annotation: IAnnotationDecorator<AnnotationMetadata> = createAnnotationDecorator<AnnotationMetadata>('Annotation', AnnotationBuilderToken);
