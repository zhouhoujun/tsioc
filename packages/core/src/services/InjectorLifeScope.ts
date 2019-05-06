import { LifeScope, Type, Modules } from '@tsdi/ioc';
import {
    InjectorActionContext, ModuleInjectorScope, ModuleToTypesAction,
    IocExtRegisterScope
} from '../injectors';
import { IocExt } from '../decorators';
import { ModuleDecoratorRegisterer } from './ModuleDecoratorRegisterer';

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
