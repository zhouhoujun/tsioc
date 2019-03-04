import { IContainer } from '../IContainer';
import { Type } from '@ts-ioc/ioc';

export interface InjectorContext {
    modules: Type<any>[];
    container: IContainer;
    injected?: Type<any>[];
}