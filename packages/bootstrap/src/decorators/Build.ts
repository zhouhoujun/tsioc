import { ClassMetadata, ITypeDecorator, Token, MetadataAdapter, MetadataExtends, createClassDecorator } from '@ts-ioc/core';
import { ITypeBuilder } from '../ITypeBuilder';
import { TypeConfigure } from '../TypeConfigure';

export interface BuildMetadata extends ClassMetadata, TypeConfigure<any> {

}

/**
 * Build decorator, use to define class build way via config.
 *
 * @export
 * @interface IBuildDecorator
 * @extends {ITypeDecorator<T>}
 * @template T
 */
export interface IBuildDecorator<T extends BuildMetadata> extends ITypeDecorator<T> {
    /**
     * Build decorator, use to define class as DI Module.
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
 * @param {(Token<ITypeBuilder<any>> | ITypeBuilder<any>)} [builder]
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IBuildDecorator<T>}
 */
export function createBuildDecorator<T extends BuildMetadata>(
    name: string,
    builder?: Token<ITypeBuilder<any>> | ITypeBuilder<any>,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IBuildDecorator<T> {

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

            if (builder && !metadata.typeBuilder) {
                metadata.typeBuilder = builder;
            }
            return metadata;
        }) as IBuildDecorator<T>;
}


/**
 * Build decorator, use to define class build way via config.
 *
 * @Build
 */
export const Build: IBuildDecorator<BuildMetadata> = createBuildDecorator<BuildMetadata>('Build');
