import { ITypeReflect } from '@tsdi/ioc';
import { ModuleConfigure } from './ModuleConfigure';

export interface IModuleReflect extends ITypeReflect {
    getAnnoation?(): ModuleConfigure;
}
