import { LifeScope, Type, Modules, DesignRegisterer, IInjector, IocExt } from '@tsdi/ioc';
import { InjectorDecorRegisterer, InjIocExtScope, ModuleToTypesAction, ModuleInjectorScope} from './injector-actions';
import { InjectorContext } from './InjectorContext';


export class InjectLifeScope extends LifeScope<InjectorContext> {
    execute(ctx: InjectorContext, next?: () => void): void {
        super.execute(ctx, next);
        // after all clean.
        ctx.destroy();
    }

    setup() {
        let ijdr = new InjectorDecorRegisterer();
        this.actInjector.regAction(InjIocExtScope);
        this.actInjector.getInstance(DesignRegisterer)
            .setRegisterer('Inject', ijdr);
        this.actInjector.setValue(InjectorDecorRegisterer, ijdr);

        ijdr.register(IocExt, InjIocExtScope);

        this.use(ModuleToTypesAction)
            .use(ModuleInjectorScope);
    }

    register(injector: IInjector, ...modules: Modules[]): Type[] {
        let types: Type[] = [];
        modules.forEach(md => {
            let ctx = InjectorContext.parse(injector, { module: md });
            this.execute(ctx);
            if (ctx.registered) {
                types.push(...ctx.registered);
            }
        });
        return types;
    }
}
