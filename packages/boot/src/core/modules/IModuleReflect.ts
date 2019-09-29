import { ITypeReflect } from '@tsdi/ioc';
import { ModuleConfigure } from './ModuleConfigure';

export interface IModuleReflect extends ITypeReflect {
    annoDecoractor?: string;
    getAnnoation?(): ModuleConfigure;
}
