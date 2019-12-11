import { LifeScope, Type, Modules, DecoratorScopes, DesignRegisterer, IInjector } from '@tsdi/ioc';
import { IocExt } from '../decorators/IocExt';
import { InjectorDecoratorRegisterer } from './InjectorDecoratorRegisterer';
import { InjectorActionContext } from './InjectorActionContext';
import { IocExtRegisterScope } from './IocExtRegisterScope';
import { ModuleToTypesAction } from './ModuleToTypesAction';
import { ModuleInjectorScope } from './ModuleInjectorScope';

export class InjectorLifeScope extends LifeScope<InjectorActionContext> {
    setup() {
        let ijdr = new InjectorDecoratorRegisterer();
        this.actInjector.regAction(IocExtRegisterScope);
        this.actInjector.getInstance(DesignRegisterer)
            .setRegisterer(DecoratorScopes.Injector, ijdr);
        this.actInjector.bindProvider(InjectorDecoratorRegisterer, ijdr);

        ijdr.register(IocExt, IocExtRegisterScope);

        this.use(ModuleToTypesAction)
            .use(ModuleInjectorScope);
    }

    register(injector: IInjector, ...modules: Modules[]): Type[] {
        let types: Type[] = [];
        modules.forEach(md => {
            let ctx = InjectorActionContext.parse({ module: md, injector: injector }, injector.getFactory());
            this.execute(ctx);
            if (ctx.registered) {
                types.push(...ctx.registered);
            }

        })
        return types;
    }
}
