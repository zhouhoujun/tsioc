import { LifeScope, Type, Modules } from '@tsdi/ioc';
import { IocExt } from '../decorators';
import { ModuleDecoratorRegisterer } from './ModuleDecoratorRegisterer';
import { InjectorActionContext } from './InjectorActionContext';
import { IocExtRegisterScope } from './IocExtRegisterScope';
import { ModuleToTypesAction } from './ModuleToTypesAction';
import { ModuleInjectorScope } from './ModuleInjectorScope';

export class InjectorLifeScope extends LifeScope<InjectorActionContext> {
    setup() {
        this.container.register(ModuleDecoratorRegisterer);

        this.registerAction(IocExtRegisterScope, true);

        let reg = this.container.get(ModuleDecoratorRegisterer);
        reg.register(IocExt, IocExtRegisterScope);

        this.use(ModuleToTypesAction)
            .use(ModuleInjectorScope, true);
    }

    register(...modules: Modules[]): Type<any>[] {
        let types: Type<any>[] = [];
        modules.forEach(md => {
            let ctx = InjectorActionContext.parse({ module: md });
            this.execute(ctx);
            if (ctx.registered) {
                types.push(...ctx.registered);
            }

        })
        return types;
    }
}
