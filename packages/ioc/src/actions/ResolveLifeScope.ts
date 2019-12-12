import { Token } from '../types';
import { isToken } from '../utils/isToken';
import { ProviderTypes } from '../providers/types';
import { ResolveActionContext, ResolveActionOption } from './ResolveActionContext';
import { IocResolveScope } from './IocResolveScope';
import { IInjector, InjectorToken } from '../IInjector';

/**
 * resolve life scope.
 *
 * @export
 * @class ResolveLifeScope
 * @extends {IocResolveScope<ResolveActionContext<T>>}
 * @template T
 */
export class ResolveLifeScope<T> extends IocResolveScope<ResolveActionContext<T>> {

    execute(ctx: ResolveActionContext, next?: () => void): void {
        if (!ctx.instance) {
            super.execute(ctx, next);
        }
    }

    setup() {
        this.use(IocResolveScope);
    }

    /**
     * resolve token in resolve chain.
     *
     * @template T
     * @param {(Token<T> | ResolveActionOption<T> | ResolveActionContext<T>)} token
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof ResolveLifeScope
     */
    resolve<T>(injector: IInjector, token: Token<T> | ResolveActionOption<T> | ResolveActionContext<T>, ...providers: ProviderTypes[]): T {
        let ctx: ResolveActionContext<T>;
        if (token instanceof ResolveActionContext) {
            ctx = token;
            if (!ctx.has(InjectorToken)) {
                ctx.set(InjectorToken, injector);
            }
        } else {
            let options = isToken(token) ? { token: token } : token;
            if (!options.injector) {
                options.injector = injector;
            }
            ctx = ResolveActionContext.parse(options, injector.getFactory());
        }
        if (!ctx) {
            return null;
        }
        providers.length && ctx.providers.inject(...providers);
        this.execute(ctx);
        return ctx.instance;
    }
}
