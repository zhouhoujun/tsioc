import { Type, IInjector } from '@tsdi/ioc';
import { IModuleReflect } from './IModuleReflect';


export class ModuleRef<T = any> {

    constructor(
        public readonly moduleType: Type<T>,
        public readonly reflect: IModuleReflect,
        public readonly exports: IInjector
    ) {

    }
}
