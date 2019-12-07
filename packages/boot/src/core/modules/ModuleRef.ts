import { AnnoationContext } from '../AnnoationContext';
import { Injector, Type } from '@tsdi/ioc';
import { CTX_MODULE_EXPORTS, CTX_MODULE_BOOTSTRAP } from '../../context-tokens';



export class ModuleRef<T> {

    get exports(): Injector {
        return this.context.get(CTX_MODULE_EXPORTS);
    }

    get bootstarp(): any {
        return this.context.get(CTX_MODULE_BOOTSTRAP);
    }

    constructor(
        public readonly moduleType: Type<T>,
        public readonly instance: T,
        public readonly context: AnnoationContext
        ) {

    }

}
