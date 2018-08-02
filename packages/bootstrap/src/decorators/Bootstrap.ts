import {
    ClassMetadata, Token, MetadataAdapter,
    MetadataExtends, ITypeDecorator
} from '@ts-ioc/core';
import { AppConfigure } from '../AppConfigure';
import { IBootBuilder } from '../IBootBuilder';
import { ApplicationBuilderToken, IApplicationBuilder } from '../IApplicationBuilder';
import { createDIModuleDecorator } from './DIModule';


export interface BootstrapMetadata extends AppConfigure, ClassMetadata {
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
     * @param {T} metadata bootstrap metadate config.
     */
    (metadata: T): ClassDecorator;
}


/**
 * create bootstrap decorator.
 *
 * @export
 * @template T
 * @param {string} decorType
 * @param {(Token<IApplicationBuilder> | IApplicationBuilder)} [builder]
 * @param {(Token<IBootBuilder<any>> | IBootBuilder<Tany>)} [moduleBuilder]
 * @param {(Token<IBootBuilder<any>> | IBootBuilder<Tany>)} [bootstrapBuilder]
 * @param {InjectToken<IApplication>} provideType default provide type.
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IBootstrapDecorator<T>}
 */
export function createBootstrapDecorator<T extends BootstrapMetadata>(
    decorType: string,
    builder?: Token<IApplicationBuilder<any>> | IApplicationBuilder<any>,
    moduleBuilder?: Token<IBootBuilder<any>> | IBootBuilder<any>,
    bootstrapBuilder?: Token<IBootBuilder<any>> | IBootBuilder<any>,
    provideType?: Token<any>,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IBootstrapDecorator<T> {

    return createDIModuleDecorator<BootstrapMetadata>(decorType, builder, moduleBuilder, bootstrapBuilder, provideType, adapter, metadataExtends) as IBootstrapDecorator<T>;
}

/**
 * Bootstrap Decorator, definde class as mvc bootstrap module.
 *
 * @Bootstrap
 */
export const Bootstrap: IBootstrapDecorator<BootstrapMetadata> = createBootstrapDecorator<BootstrapMetadata>('bootstrap', ApplicationBuilderToken);
