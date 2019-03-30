import { IResolverContainer } from '@tsdi/ioc';
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
