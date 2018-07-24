import { createClassDecorator, ClassMetadata, Token, InjectToken, MetadataAdapter, MetadataExtends, ITypeDecorator, Registration, isString, isObject, isToken, isClass } from '@ts-ioc/core';
import { IModuleBuilder, ModuleBuilderToken } from '../IModuleBuilder';
import { IApplication, ApplicationToken } from '../IApplication';
import { ModuleConfiguration } from '../ModuleConfiguration';
import { isBoolean } from 'util';

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
    (metadata?: T): ClassDecorator;

    /**
     * DIModule decorator, use to define class as DI Module.
     *
     * @DIModule
     * @param {string} provide DI Module name or provide.
     * @param {string} [alias] DI Module alias name.
     */
    (provide: Registration<any> | symbol | string, alias?: string): ClassDecorator;

    /**
     * DIModule decorator, use to define class as DI Module.
     *
     * @DIModule
     * @param {string} provide DI Module name or provide.
     * @param {string} builder DI Module builder token.
     * @param {string} [alias] DI Module alias name
     */
    (provide: Registration<any> | symbol | string, builder?: Token<IApplication>, alias?: string): ClassDecorator;

    /**
     * DIModule decorator, use to define class as DI Module.
     *
     * @DIModule
     * @param {string} provide DI Module name or provide.
     * @param {string} builder DI Module builder token.
     * @param {string} [alias] set DI Module as singleton or not.
     */
    (provide: Registration<any> | symbol | string, builder?: Token<IApplication>, singleton?: boolean): ClassDecorator;

    /**
     * DIModule decorator, use to define class as Application DIModule element.
     *
     * @DIModule
     */
    (target: Function): void;
}


/**
 * create bootstrap decorator.
 *
 * @export
 * @template T
 * @param {string} decorType
 * @param {(Token<IModuleBuilder<T>> | IModuleBuilder<T>)} builder
 * @param {InjectToken<IApplication>} provideType default provide type.
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IDIModuleDecorator<T>}
 */
export function createDIModuleDecorator<T extends DIModuleMetadata>(
    decorType: string,
    builder: Token<IModuleBuilder<T>> | IModuleBuilder<T>,
    provideType?: Token<any>,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IDIModuleDecorator<T> {

    return createClassDecorator<DIModuleMetadata>('DIModule',
        args => {
            if (adapter) {
                adapter(args);
            }
            args.next<DIModuleMetadata>({
                match: (arg) => arg && (isString(arg) || (isObject(arg) && arg instanceof Registration)),
                setMetadata: (metadata, arg) => {
                    if (isString(arg)) {
                        metadata.name = arg;
                    } else {
                        metadata.provide = arg;
                    }
                }
            });

            args.next<DIModuleMetadata>({
                match: (arg) => isString(arg) || isToken(arg),
                setMetadata: (metadata, arg) => {
                    if (isString(arg)) {
                        metadata.name = arg;
                    } else {
                        metadata.builder = arg;
                    }
                }
            });

            args.next<DIModuleMetadata>({
                match: (arg) => isString(arg) || isBoolean(arg),
                setMetadata: (metadata, arg) => {
                    if (isString(arg)) {
                        metadata.name = arg;
                    } else if (isBoolean(arg)) {
                        metadata.singleton = arg;
                    }
                }
            });
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
            return metadata;
        }) as IDIModuleDecorator<T>;
}

/**
 * DIModule Decorator, definde class as DI module.
 *
 * @DIModule
 */
export const DIModule: IDIModuleDecorator<DIModuleMetadata> = createDIModuleDecorator<DIModuleMetadata>('module', ModuleBuilderToken);
