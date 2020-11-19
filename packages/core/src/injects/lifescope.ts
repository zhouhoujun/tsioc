import { LifeScope, Type, Modules, IInjector, lang } from '@tsdi/ioc';
import { InjModuleToTypesAction, InjModuleScope } from './actions';
import { InjContext } from './context';

/**
 * module inject life scope.
 */
export class InjLifeScope extends LifeScope<InjContext> {
    execute(ctx: InjContext, next?: () => void): void {
        super.execute(ctx, next);
    }

    setup() {
        this.use(InjModuleToTypesAction, InjModuleScope);
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
                types = ctx.registered;
            }
            lang.cleanObj(ctx);
        });
        return types;
    }
}
