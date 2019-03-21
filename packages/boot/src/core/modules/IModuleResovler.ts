import { IResolverContainer } from '@ts-ioc/ioc';
import { IContainer } from '@ts-ioc/core';

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
