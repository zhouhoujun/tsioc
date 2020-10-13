import { Type, IInjector, Registered } from '@tsdi/ioc';


export interface ModuleRegistered extends Registered {
    moduleRef?: ModuleRef;
}

export class ModuleRef<T = any> {

    constructor(
        public readonly moduleType: Type<T>,
        public readonly exports: IInjector
    ) {

    }
}
