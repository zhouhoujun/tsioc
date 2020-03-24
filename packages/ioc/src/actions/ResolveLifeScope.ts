import { Token } from '../types';
import { isToken } from '../utils/isToken';
import { ProviderTypes } from '../providers/types';
import { ResolveContext, ResolveOption, IResolveContext } from './ResolveActionContext';
import { IocResolveScope } from './IocResolveScope';
import { IInjector, INJECTOR, InjectorProxyToken } from '../IInjector';
import { isNullOrUndefined } from '../utils/lang';

/**
 * resolve life scope.
 *
 * @export
 * @class ResolveLifeScope
 * @extends {IocResolveScope<ResolveContext<T>>}
 * @template T
 */
export class ResolveLifeScope<T> extends IocResolveScope<IResolveContext<T>> {

    execute(ctx: IResolveContext, next?: () => void): void {
        if (isNullOrUndefined(ctx.instance)) {
            super.execute(ctx, next);
        }

        // after all clean.
        ctx.destroy();
    }

    setup() {
        this.use(IocResolveScope);
    }

    /**
     * resolve token in resolve chain.
     *
     * @template T
     * @param {(Token<T> | ResolveOption<T>)} token
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof ResolveLifeScope
     */
    resolve<T>(injector: IInjector, token: Token<T> | ResolveOption<T>, ...providers: ProviderTypes[]): T {
        let ctx = ResolveContext.parse(injector, isToken(token) ? { token: token } : token);
        let pdr = ctx.providers;
        providers.length && pdr.inject(...providers);
        if (!pdr.hasTokenKey(INJECTOR)) {
            pdr.inject(
                { provide: INJECTOR, useValue: injector },
                { provide: InjectorProxyToken, useValue: injector.getProxy() });
        }
        this.execute(ctx);
        return ctx.instance;
    }
}
