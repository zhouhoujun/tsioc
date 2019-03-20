import { IResolverContainer } from '@ts-ioc/ioc';
import { IContainer } from '@ts-ioc/core';

export interface IModuleResolver extends IResolverContainer {
    getContainer(): IContainer;
    getProviders(): IResolverContainer;
}
