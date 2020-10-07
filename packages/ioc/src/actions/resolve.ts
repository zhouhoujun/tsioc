import { isNullOrUndefined } from '../utils/lang';
import { IInjector } from '../IInjector';
import { isToken, Provider, Token } from '../tokens';
import { INJECTOR, InjectorProxyToken, PROVIDERS } from '../utils/tk';
import * as rla from './res-act';
import { ResolveContext, ResolveOption } from './res';

/**
 * resolve life scope.
 *
 * @export
 * @class ResolveLifeScope
 * @extends {IocResolveScope<ResolveContext<T>>}
 * @template T
 */
export class ResolveLifeScope extends rla.IocResolveScope<ResolveContext> {

    execute(ctx: ResolveContext, next?: () => void): void {
        if (isNullOrUndefined(ctx.instance)) {
            super.execute(ctx, next);
        }
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
        let ctx = {
            injector,
            ... (isToken(token) ? { token: token } : token),
            providers: injector.get(PROVIDERS).inject(...providers)
        } as ResolveContext;
        if (!ctx.providers.hasTokenKey(INJECTOR)) {
            ctx.providers.inject(
                { provide: INJECTOR, useValue: injector },
                { provide: InjectorProxyToken, useValue: injector.getProxy() });
        }
        this.execute(ctx);
        return ctx.instance;
    }
}
