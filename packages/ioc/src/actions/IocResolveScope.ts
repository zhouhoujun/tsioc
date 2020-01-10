import { ResolveActionContext } from './ResolveActionContext';
import { ResolveInInjectorAction } from './resolves/ResolveInInjectorAction';
import { ResolveInRootAction } from './resolves/ResolveInRootAction';
import { ResolvePrivateAction } from './resolves/ResolvePrivateAction';
import { ActionScope } from './ActionScope';
import { ResolveRefAction } from './resolves/ResolveRefAction';
import { isNullOrUndefined, isClass, lang } from '../utils/lang';
import { isToken } from '../utils/isToken';
import { CTX_TARGET_TOKEN } from '../context-tokens';


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
            let target = ctx.getOptions().target;
            if (target) {
                ctx.set(CTX_TARGET_TOKEN, isToken(target) ? target : lang.getClass(target));
            }
            super.execute(ctx);
        }

        if (isNullOrUndefined(ctx.instance) && next) {
            next();
        }

        // after all.
        if (isNullOrUndefined(ctx.instance) && ctx.getOptions().regify && isClass(ctx.token) && !ctx.injector.has(ctx.token)) {
            ctx.injector.registerType(ctx.token);
            ctx.instance = ctx.injector.get(ctx.token, ctx.providers);
        }

        // after all clean.
        (async () => {
            ctx.clear();
        })();
    }

    setup() {
        this.use(ResolvePrivateAction)
            .use(ResolveRefAction)
            .use(ResolveInInjectorAction)
            .use(ResolveInRootAction);
    }
}
