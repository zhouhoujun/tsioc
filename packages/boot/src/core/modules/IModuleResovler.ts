import { IResolverContainer } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { IModuleReflect } from './IModuleReflect';

/**
 * module resolver.
 *
 * @export
 * @interface IModuleResolver
 * @extends {IResolverContainer}
 */
export interface IModuleResolver extends IResolverContainer {
    getContainer(): IContainer;
    getProviders(): IResolverContainer;
}


/**
 * di module reflect info.
 *
 * @export
 * @interface IDIModuleReflect
 * @extends {ITypeReflect}
 */
export interface IDIModuleReflect extends IModuleReflect {
    /**
     * module resolver of DIModule
     *
     * @type {IModuleResolver}
     * @memberof IDIModuleReflect
     */
    moduleResolver?: IModuleResolver;
}
