import { LifeScope, Type, Modules, DecoratorScopes, DesignRegisterer, IInjector } from '@tsdi/ioc';
import { IocExt } from '../decorators/IocExt';
import { InjectDecoratorRegisterer } from './InjectDecoratorRegisterer';
import { InjectActionContext } from './InjectActionContext';
import { IocExtRegisterScope } from './IocExtRegisterScope';
import { ModuleToTypesAction } from './ModuleToTypesAction';
import { ModuleInjectScope } from './ModuleInjectScope';

export class InjectLifeScope extends LifeScope<InjectActionContext> {
    setup() {
        let ijdr = new InjectDecoratorRegisterer();
        this.actInjector.regAction(IocExtRegisterScope);
        this.actInjector.getInstance(DesignRegisterer)
            .setRegisterer(DecoratorScopes.Injector, ijdr);
        this.actInjector.bindProvider(InjectDecoratorRegisterer, ijdr);

        ijdr.register(IocExt, IocExtRegisterScope);

        this.use(ModuleToTypesAction)
            .use(ModuleInjectScope);
    }

    register(injector: IInjector, ...modules: Modules[]): Type[] {
        let types: Type[] = [];
        modules.forEach(md => {
            let ctx = InjectActionContext.parse({ module: md, injector: injector }, injector.getFactory());
            this.execute(ctx);
            if (ctx.registered) {
                types.push(...ctx.registered);
            }

        })
        return types;
    }
}
