import { Token } from '../types';
import { isToken } from '../utils/isToken';
import { ProviderTypes } from '../providers/types';
import { ResolveActionContext, ResolveActionOption } from './ResolveActionContext';
import { IocResolveScope } from './IocResolveScope';
import { IInjector } from '../IInjector';
import { isNullOrUndefined } from '../utils/lang';

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
        if (isNullOrUndefined(ctx.instance)) {
            super.execute(ctx, next);
        }

        // after all clean.
        ctx.clear();
    }

    setup() {
        this.use(IocResolveScope);
    }

    /**
     * resolve token in resolve chain.
     *
     * @template T
     * @param {(Token<T> | ResolveActionOption<T>)} token
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof ResolveLifeScope
     */
    resolve<T>(injector: IInjector, token: Token<T> | ResolveActionOption<T>, ...providers: ProviderTypes[]): T {
        let ctx = ResolveActionContext.parse(injector, isToken(token) ? { token: token } : token);
        providers.length && ctx.providers.inject(...providers);
        this.execute(ctx);
        return ctx.instance;
    }
}
