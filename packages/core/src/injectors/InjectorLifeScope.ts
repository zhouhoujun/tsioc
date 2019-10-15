import { LifeScope, Type, Modules, DecoratorScopes } from '@tsdi/ioc';
import { IocExt } from '../decorators';
import { InjectorDecoratorRegisterer } from './InjectorDecoratorRegisterer';
import { InjectorActionContext } from './InjectorActionContext';
import { IocExtRegisterScope } from './IocExtRegisterScope';
import { ModuleToTypesAction } from './ModuleToTypesAction';
import { ModuleInjectorScope } from './ModuleInjectorScope';

export class InjectorLifeScope extends LifeScope<InjectorActionContext> {
    setup() {
        let ijdr = new InjectorDecoratorRegisterer();
        this.registerAction(IocExtRegisterScope, true);
        this.container.getDesignRegisterer()
            .setRegisterer(DecoratorScopes.Injector, ijdr);
        this.container.bindProvider(InjectorDecoratorRegisterer, ijdr);

        ijdr.register(IocExt, IocExtRegisterScope);

        this.use(ModuleToTypesAction)
            .use(ModuleInjectorScope, true);
    }

    execute(ctx: InjectorActionContext, next?: () => void): void {
        if (!ctx.reflects) {
            ctx.reflects = this.container.getTypeReflects();
        }
        super.execute(ctx, next);
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
