import { ResolveActionContext } from './ResolveActionContext';
import { ResolveInInjectorAction } from './resolves/ResolveInInjectorAction';
import { ResolveInRootAction } from './resolves/ResolveInRootAction';
import { ActionScope } from './ActionScope';


/**
 * register action scope.
 *  the register type class can only register in ioc as:
 * ` container.registerSingleton(SubResolveAction, () => new SubResolveAction(container));`
 *
 * @export
 * @abstract
 * @class IocResolveScope
 * @extends {ActionScope<T>}
 * @template T
 */
export class IocResolveScope<T extends ResolveActionContext = ResolveActionContext> extends ActionScope<T> {

    execute(ctx: T, next?: () => void): void {
        if (!ctx.instance) {
            super.execute(ctx, next);
        }
    }

    setup() {
        this.use(ResolveInInjectorAction)
            .use(ResolveInRootAction);
    }
}
