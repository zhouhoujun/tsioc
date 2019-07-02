import { LifeScope, Type, Modules } from '@tsdi/ioc';
import { IocExt } from '../decorators';
import { InjectorDecoratorRegisterer } from './InjectorDecoratorRegisterer';
import { InjectorActionContext } from './InjectorActionContext';
import { IocExtRegisterScope } from './IocExtRegisterScope';
import { ModuleToTypesAction } from './ModuleToTypesAction';
import { ModuleInjectorScope } from './ModuleInjectorScope';

export class InjectorLifeScope extends LifeScope<InjectorActionContext> {
    setup() {
        this.container.register(InjectorDecoratorRegisterer);

        this.registerAction(IocExtRegisterScope, true);

        this.container.get(InjectorDecoratorRegisterer)
            .register(IocExt, IocExtRegisterScope);

        this.use(ModuleToTypesAction)
            .use(ModuleInjectorScope, true);
    }

    register(...modules: Modules[]): Type[] {
        let types: Type[] = [];
        modules.forEach(md => {
            let ctx = InjectorActionContext.parse({ module: md }, this.container);
            this.execute(ctx);
            if (ctx.registered) {
                types.push(...ctx.registered);
            }

        })
        return types;
    }
}
