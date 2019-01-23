import { createClassDecorator, Token, MetadataAdapter, MetadataExtends, ITypeDecorator, isClass, lang, isToken } from '@ts-ioc/core';
import { IModuleBuilder, ModuleBuilderToken } from '../modules/IModuleBuilder';
import { ModuleConfig } from '../modules/ModuleConfigure';
import { IAnnotationBuilder, AnnotationBuilderToken } from '../annotations/IAnnotationBuilder';

/**
 * DI module metadata.
 *
 * @export
 * @interface DIModuleMetadata
 * @extends {ModuleConfig<any>}
 * @extends {ClassMetadata}
 */
export interface DIModuleMetadata extends ModuleConfig<any> {
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
 * @param {Token<IModuleBuilder>} [defaultBuilder]
 * @param {Token<IAnnotationBuilder<any>>} [defaultAnnoBuilder]
 * @param {defaultBoot?: Token<any> | ((metadata: T) => Token<any>)} [defaultBoot]
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IDIModuleDecorator<T>}
 */
export function createDIModuleDecorator<T extends DIModuleMetadata>(
    name: string,
    defaultBuilder?: Token<IModuleBuilder<any>>,
    defaultAnnoBuilder?: Token<IAnnotationBuilder<any>>,
    defaultBoot?: Token<any> | ((metadata: T) => Token<any>),
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
                metadataExtends(metadata as T);
            }

            if (!metadata.name && isClass(metadata.token)) {
                let isuglify = /^[a-z]$/.test(metadata.token.name);
                let classAnnations = lang.getClassAnnations(metadata.token);
                if (isuglify && classAnnations) {
                    metadata.name = classAnnations.name;
                } else {
                    metadata.name = metadata.token.name;
                }
            }

            metadata.decorType = name;
            if (defaultBuilder && !metadata.defaultBuilder) {
                metadata.defaultBuilder = defaultBuilder;
            }
            if (defaultAnnoBuilder && !metadata.defaultAnnoBuilder) {
                metadata.defaultAnnoBuilder = defaultAnnoBuilder;
            }
            if (!metadata.bootstrap && defaultBoot) {
                let defboot = isToken(defaultBoot) ? defaultBoot : defaultBoot(metadata as T);
                if (defboot) {
                    metadata.bootstrap = defboot;
                }
            }
        }) as IDIModuleDecorator<T>;
}

/**
 * DIModule Decorator, definde class as DI module.
 *
 * @DIModule
 */
export const DIModule: IDIModuleDecorator<DIModuleMetadata> = createDIModuleDecorator<DIModuleMetadata>('DIModule', ModuleBuilderToken, AnnotationBuilderToken);
