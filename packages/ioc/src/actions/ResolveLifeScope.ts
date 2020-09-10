import { isNullOrUndefined } from '../utils/lang';
import { Token, isToken, Provider } from '../tokens';
import { IInjector, INJECTOR, InjectorProxyToken } from '../IInjector';
import { ResolveContext, ResolveOption, IResolveContext } from './IocResolveAction';
import * as rla from './resolves';


/**
 * resolve life scope.
 *
 * @export
 * @class ResolveLifeScope
 * @extends {IocResolveScope<ResolveContext<T>>}
 * @template T
 */
export class ResolveLifeScope<T> extends rla.IocResolveScope<IResolveContext<T>> {

    execute(ctx: IResolveContext, next?: () => void): void {
        if (isNullOrUndefined(ctx.instance)) {
            super.execute(ctx, next);
        }

        // after all clean.
        ctx.destroy();
    }

    setup() {
        this.use(rla.IocResolveScope);
    }

    /**
     * resolve token in resolve chain.
     *
     * @template T
     * @param {(Token<T> | ResolveOption<T>)} token
     * @param {...Provider[]} providers
     * @returns {T}
     * @memberof ResolveLifeScope
     */
    resolve<T>(injector: IInjector, token: Token<T> | ResolveOption<T>, ...providers: Provider[]): T {
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
