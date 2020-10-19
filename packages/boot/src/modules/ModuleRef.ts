import { Type, Registered, Destoryable, lang } from '@tsdi/ioc';
import { ModuleProviders } from './injector';


export interface ModuleRegistered extends Registered {
    moduleRef?: ModuleRef;
}

export class ModuleRef<T = any> extends Destoryable {

    constructor(
        public readonly moduleType: Type<T>,
        public readonly exports: ModuleProviders
    ) {
        super();
    }

    protected destroying() {
        this.exports.destroy();
        this.exports.moduleInjector.destroy();
        this.exports.moduleInjector = null;
        lang.cleanObj(this);
    }
}
