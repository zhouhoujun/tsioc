import { LifeScope, Type, Modules, DesignRegisterer, IInjector, IocExt, lang } from '@tsdi/ioc';
import { InjDecorRegisterer, InjIocExtScope, InjModuleToTypesAction, InjModuleScope } from './actions';
import { InjContext } from './context';

/**
 * module inject life scope.
 */
export class InjLifeScope extends LifeScope<InjContext> {
    execute(ctx: InjContext, next?: () => void): void {
        super.execute(ctx, next);
    }

    setup() {
        let ijdr = new InjDecorRegisterer();
        this.actInjector.regAction(InjIocExtScope);
        this.actInjector.getInstance(DesignRegisterer)
            .setRegisterer('Inj', ijdr);
        this.actInjector.setValue(InjDecorRegisterer, ijdr);

        ijdr.register(IocExt, InjIocExtScope);

        this.use(InjModuleToTypesAction)
            .use(InjModuleScope);
    }

    register(injector: IInjector, ...modules: Modules[]): Type[] {
        let types: Type[] = [];
        modules.forEach(md => {
            let ctx = {
                injector,
                module: md
            } as InjContext;
            this.execute(ctx);
            if (ctx.registered) {
                types.push(...ctx.registered);
            }
            lang.cleanObj(ctx);
        });
        return types;
    }
}
