import {
    ClassMetadata, Token, InjectToken, MetadataAdapter,
    MetadataExtends, ITypeDecorator, Registration
} from '@ts-ioc/core';
import { AppConfiguration } from '../AppConfiguration';
import { IModuleBuilder, ModuleBuilderToken } from '../IModuleBuilder';
import { IApplication, ApplicationToken } from '../IApplication';
import { createDIModuleDecorator } from './DIModule';


export interface BootstrapMetadata extends AppConfiguration<any>, ClassMetadata {
    decorType?: string;
}


/**
 * Bootstrap decorator, use to define class is a task element.
 *
 * @export
 * @interface IBootstrapDecorator
 * @extends {ITypeDecorator<T>}
 * @template T
 */
export interface IBootstrapDecorator<T extends BootstrapMetadata> extends ITypeDecorator<T> {
    /**
     * Bootstrap decorator, use to define class as Application Bootstrap element.
     *
     * @Bootstrap
     *
     * @param {T} [metadata] bootstrap metadate config.
     */
    (metadata?: T): ClassDecorator;

    /**
     * Bootstrap decorator, use to define class as Application Bootstrap element.
     *
     * @Bootstrap
     * @param {string} provide application name or provide.
     * @param {string} [alias] application alias name.
     */
    (provide: Registration<any> | symbol | string, alias?: string): ClassDecorator;

    /**
     * Bootstrap decorator, use to define class as Application Bootstrap element.
     *
     * @Bootstrap
     * @param {string} provide application name or provide.
     * @param {string} builder application builder token.
     * @param {string} [alias] application alias name
     */
    (provide: Registration<any> | symbol | string, builder?: Token<IApplication>, alias?: string): ClassDecorator;

    /**
     * Bootstrap decorator, use to define class as Application Bootstrap element.
     *
     * @Bootstrap
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
 * @returns {IBootstrapDecorator<T>}
 */
export function createBootstrapDecorator<T extends BootstrapMetadata>(
    decorType: string,
    builder: Token<IModuleBuilder<T>> | IModuleBuilder<T>,
    provideType: InjectToken<IApplication>,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IBootstrapDecorator<T> {

    return createDIModuleDecorator<BootstrapMetadata>(decorType, builder, provideType, adapter, metadataExtends) as IBootstrapDecorator<T>;
}

/**
 * Bootstrap Decorator, definde class as mvc bootstrap module.
 *
 * @Bootstrap
 */
export const Bootstrap: IBootstrapDecorator<BootstrapMetadata> = createBootstrapDecorator<BootstrapMetadata>('bootstrap', ModuleBuilderToken, ApplicationToken);
