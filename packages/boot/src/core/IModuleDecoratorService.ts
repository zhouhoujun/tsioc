import { Type, ClassType, ITypeReflect, InjectToken } from '@tsdi/ioc';
import { ModuleConfigure } from './modules';
import { IContainer } from '@tsdi/core';

/**
 * module decorator metadata service
 *
 * @export
 * @interface IModuleDecoratorService
 */
export interface IModuleDecoratorService {
    getDecorator(type: Type<any>): string;
    getAnnoation(type: Type<any>, decorator?: string): ModuleConfigure;
    getReflect<T extends ITypeReflect>(type: ClassType<any>, container: IContainer): { reflect: T, container: IContainer };
}

export const ModuleDecoratorServiceToken = new InjectToken<IModuleDecoratorService>('ModuleDecoratorService');
