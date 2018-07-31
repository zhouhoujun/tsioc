import { createClassDecorator, ClassMetadata, Token, MetadataAdapter, MetadataExtends, ITypeDecorator, isClass } from '@ts-ioc/core';
import { IModuleBuilder, ModuleBuilderToken } from '../IModuleBuilder';
import { ModuleConfiguration } from '../ModuleConfiguration';
import { IBootstrapBuilder } from '../IBootstrapBuilder';

/**
 * DI module metadata.
 *
 * @export
 * @interface DIModuleMetadata
 * @extends {ModuleConfiguration<any>}
 * @extends {ClassMetadata}
 */
export interface DIModuleMetadata extends ModuleConfiguration<any>, ClassMetadata {
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
 * @param {string} decorType
 * @param {(Token<IModuleBuilder> | IModuleBuilder)} [builder]
 * @param {(Token<IBootstrapBuilder<T>> | IBootstrapBuilder<T>)} [bootBuilder]
 * @param {InjectToken<IApplication>} provideType default provide type.
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IDIModuleDecorator<T>}
 */
export function createDIModuleDecorator<T extends DIModuleMetadata>(
    decorType: string,
    builder?: Token<IModuleBuilder> | IModuleBuilder,
    bootBuilder?: Token<IBootstrapBuilder<any>> | IBootstrapBuilder<any>,
    provideType?: Token<any>,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IDIModuleDecorator<T> {

    return createClassDecorator<DIModuleMetadata>('DIModule',
        args => {
            if (adapter) {
                adapter(args);
            }
        },
        metadata => {
            if (metadataExtends) {
                metadata = metadataExtends(metadata as T);
            }

            if (!metadata.name && isClass(metadata.type)) {
                let isuglify = /^[a-z]$/.test(metadata.type.name);
                if (isuglify && metadata.type.classAnnations) {
                    metadata.name = metadata.type.classAnnations.name;
                } else {
                    metadata.name = metadata.type.name;
                }
            }

            metadata.provide = metadata.provide || provideType;
            metadata.alias = metadata.alias || metadata.name;

            metadata.decorType = decorType;
            if (!metadata.builder) {
                metadata.builder = builder;
            }
            if (!metadata.bootBuilder) {
                metadata.bootBuilder = bootBuilder;
            }
            return metadata;
        }) as IDIModuleDecorator<T>;
}

/**
 * DIModule Decorator, definde class as DI module.
 *
 * @DIModule
 */
export const DIModule: IDIModuleDecorator<DIModuleMetadata> = createDIModuleDecorator<DIModuleMetadata>('module');
