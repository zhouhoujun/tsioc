import { IResolverContainer, ITypeReflect } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';

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
export interface IDIModuleReflect extends ITypeReflect {
    /**
     * module resolver of DIModule
     *
     * @type {ModuleResovler<any>}
     * @memberof IDIModuleReflect
     */
    moduleResolver?: IModuleResolver;
}
