import { createClassDecorator, ClassMetadata, Token, MetadataAdapter, MetadataExtends, ITypeDecorator, isClass } from '@ts-ioc/core';
import { IModuleBuilder } from '../modules/IModuleBuilder';
import { ModuleConfig } from '../modules/ModuleConfigure';
import { IAnnotationBuilder } from '../annotations/IAnnotationBuilder';

/**
 * DI module metadata.
 *
 * @export
 * @interface DIModuleMetadata
 * @extends {ModuleConfig<any>}
 * @extends {ClassMetadata}
 */
export interface DIModuleMetadata extends ModuleConfig<any>, ClassMetadata {
    /**
     * custom decorator type.
     *
     * @type {string}
     * @memberof DIModuleMetadata
     */
    decorType?: string;
}


/**
 * DIModule decorator, use to define class as DI Module.
 *
 * @export
 * @interface IDIModuleDecorator
 * @extends {ITypeDecorator<T>}
 * @template T
 */
export interface IDIModuleDecorator<T extends DIModuleMetadata> extends ITypeDecorator<T> {
    /**
     * DIModule decorator, use to define class as DI Module.
     *
     * @DIModule
     *
     * @param {T} [metadata] bootstrap metadate config.
     */
    (metadata: T): ClassDecorator;
}


/**
 * create bootstrap decorator.
 *
 * @export
 * @template T
 * @param {string} name decorator name.
 * @param {(Token<IModuleBuilder> | IModuleBuilder)} [builder]
 * @param {(Token<IAnnotationBuilder<any>> | IAnnotationBuilder<any>)} [annotationBuilder]
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IDIModuleDecorator<T>}
 */
export function createDIModuleDecorator<T extends DIModuleMetadata>(
    name: string,
    builder?: Token<IModuleBuilder<any>> | IModuleBuilder<any>,
    annotationBuilder?: Token<IAnnotationBuilder<any>> | IAnnotationBuilder<any>,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IDIModuleDecorator<T> {

    return createClassDecorator<DIModuleMetadata>(name,
        args => {
            if (adapter) {
                adapter(args);
            }
        },
        metadata => {
            if (metadataExtends) {
                metadata = metadataExtends(metadata as T);
            }

            if (!metadata.name && isClass(metadata.token)) {
                let isuglify = /^[a-z]$/.test(metadata.token.name);
                if (isuglify && metadata.token.classAnnations) {
                    metadata.name = metadata.token.classAnnations.name;
                } else {
                    metadata.name = metadata.token.name;
                }
            }

            metadata.decorType = name;
            if (builder && !metadata.builder) {
                metadata.builder = builder;
            }
            if (annotationBuilder && !metadata.annotationBuilder) {
                metadata.annotationBuilder = annotationBuilder;
            }
            return metadata;
        }) as IDIModuleDecorator<T>;
}

/**
 * DIModule Decorator, definde class as DI module.
 *
 * @DIModule
 */
export const DIModule: IDIModuleDecorator<DIModuleMetadata> = createDIModuleDecorator<DIModuleMetadata>('DIModule');
