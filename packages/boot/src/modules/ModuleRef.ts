import { Type, IInjector } from '@tsdi/ioc';
import { ModuleReflect } from './reflect';


export class ModuleRef<T = any> {

    constructor(
        public readonly moduleType: Type<T>,
        public readonly exports: IInjector
    ) {

    }
}
