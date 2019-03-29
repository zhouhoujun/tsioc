import { InjectorScope } from './InjectorAction';
import { InjectorActionContext } from './InjectorActionContext';
import { Autorun, Singleton } from '@ts-ioc/ioc';
import { DecoratorInjectorScope } from './DecoratorInjectorScope';
import { ModuleInjectorAction } from './ModuleInjectorAction';

@Singleton
@Autorun('setup')
export class ModuleInjectorScope extends InjectorScope<InjectorActionContext> {
    setup() {
        if (!this.container.has(DecoratorInjectorScope)) {
            this.container.register(DecoratorInjectorScope);
        }
        if (!this.container.has(ModuleInjectorAction)) {
            this.container.register(ModuleInjectorAction);
        }
        this.use(DecoratorInjectorScope)
            .use(ModuleInjectorAction);
    }
}
