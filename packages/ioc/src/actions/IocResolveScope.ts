import { ResolveActionContext } from './ResolveActionContext';
import { ResolveInInjectorAction } from './resolves/ResolveInInjectorAction';
import { ResolveInRootAction } from './resolves/ResolveInRootAction';
import { ResolvePrivateAction } from './resolves/ResolvePrivateAction';
import { ActionScope } from './ActionScope';
import { ResolveRefAction } from './resolves/ResolveRefAction';
import { isNullOrUndefined, isClass } from '../utils/lang';


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

        if (isNullOrUndefined(ctx.instance) && ctx.getOptions().regify && isClass(ctx.token) && !ctx.injector.has(ctx.token)) {
            ctx.injector.register(ctx.token);
            ctx.instance = ctx.injector.get(ctx.token, ctx.providers);
        }
    }

    setup() {
        this.use(ResolvePrivateAction)
            .use(ResolveRefAction)
            .use(ResolveInInjectorAction)
            .use(ResolveInRootAction);
    }
}
