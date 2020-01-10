import { LifeScope, Type, Modules, DecoratorScopes, DesignRegisterer, IInjector, IocExt } from '@tsdi/ioc';
import { InjectDecoratorRegisterer } from './InjectDecoratorRegisterer';
import { InjectActionContext } from './InjectActionContext';
import { IocExtRegisterScope } from './IocExtRegisterScope';
import { ModuleToTypesAction } from './ModuleToTypesAction';
import { ModuleInjectScope } from './ModuleInjectScope';

export class InjectLifeScope extends LifeScope<InjectActionContext> {
    execute(ctx: InjectActionContext, next?: () => void): void {
        super.execute(ctx, next);
        // after all clean.
        ctx.clear();
    }

    setup() {
        let ijdr = new InjectDecoratorRegisterer();
        this.actInjector.regAction(IocExtRegisterScope);
        this.actInjector.getInstance(DesignRegisterer)
            .setRegisterer(DecoratorScopes.Inject, ijdr);
        this.actInjector.registerValue(InjectDecoratorRegisterer, ijdr);

        ijdr.register(IocExt, IocExtRegisterScope);

        this.use(ModuleToTypesAction)
            .use(ModuleInjectScope);
    }

    register(injector: IInjector, ...modules: Modules[]): Type[] {
        let types: Type[] = [];
        modules.forEach(md => {
            let ctx = InjectActionContext.parse(injector, { module: md });
            this.execute(ctx);
            if (ctx.registered) {
                types.push(...ctx.registered);
            }
        });
        return types;
    }
}
