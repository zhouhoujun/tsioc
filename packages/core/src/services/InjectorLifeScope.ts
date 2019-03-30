import { LifeScope, Singleton, Autorun, Type, Modules } from '@tsdi/ioc';
import {
    InjectorActionContext, ModuleInjectorScope, ModuleToTypesAction,
    IocExtRegisterScope, ModuleDecoratorRegisterer
} from '../injectors';
import { IocExt } from '../decorators';

@Singleton
@Autorun('setup')
export class InjectorLifeScope extends LifeScope<InjectorActionContext> {
    setup() {
        this.container.register(ModuleDecoratorRegisterer);

        this.registerAction(ModuleToTypesAction)
            .registerAction(IocExtRegisterScope)
            .registerAction(ModuleInjectorScope, true);

        let reg = this.container.get(ModuleDecoratorRegisterer);
        reg.register(IocExt, IocExtRegisterScope);

        this.use(ModuleToTypesAction)
            .use(ModuleInjectorScope);
    }

    register(...modules: Modules[]): Type<any>[] {
        let types: Type<any>[] = [];
        modules.forEach(md => {
            let ctx = InjectorActionContext.parse({ modules: md });
            this.execute(ctx);
            if (ctx.registered) {
                types.push(...ctx.registered);
            }

        })
        return types;
    }
}
