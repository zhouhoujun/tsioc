import { Token } from '../types';
import { isToken } from '../utils/isToken';
import { ProviderTypes } from '../providers/types';
import { ResolveActionContext, ResolveActionOption } from './ResolveActionContext';
import { IocResolveScope } from './IocResolveScope';

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
    resolve<T>(token: Token<T> | ResolveActionOption<T> | ResolveActionContext<T>, ...providers: ProviderTypes[]): T {
        let ctx: ResolveActionContext<T>;
        if (token instanceof ResolveActionContext) {
            ctx = token;
        } else {
            ctx = ResolveActionContext.parse(isToken(token) ? { token: token } : token, this.actInjector.getFactory());
        }
        if (!ctx) {
            return null;
        }
        providers.length && ctx.providers.inject(...providers);
        this.execute(ctx);
        return ctx.instance;
    }
}
