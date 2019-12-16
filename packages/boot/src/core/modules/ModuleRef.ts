import { Type, IInjector, Token } from '@tsdi/ioc';
import { IModuleReflect } from './IModuleReflect';


export class ModuleRef<T> {

    constructor(
        public readonly moduleType: Type<T>,
        public readonly reflect: IModuleReflect,
        public readonly exports: IInjector
        ) {

    }

    create<T>(type: Token<T>) {
        return this.exports.get(type);
    }

}
