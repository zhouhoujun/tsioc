import { Type, InjectToken } from '@tsdi/ioc';
import { ModuleConfigure } from './modules';

/**
 * module decorator metadata service
 *
 * @export
 * @interface IModuleDecoratorService
 */
export interface IModuleDecoratorService {
    getDecorator(type: Type<any>): string;
    getAnnoation(type: Type<any>, decorator?: string): ModuleConfigure;
}

export const ModuleDecoratorServiceToken = new InjectToken<IModuleDecoratorService>('ModuleDecoratorService');
