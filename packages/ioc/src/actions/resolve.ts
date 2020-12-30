import { isNullOrUndefined, lang } from '../utils/lang';
import { IInjector, ResolveOption } from '../IInjector';
import { isToken, ProviderType, Token } from '../tokens';
import { INJECTOR, InjectorProxyToken, PROVIDERS } from '../utils/tk';
import * as rla from './res-act';
import { ResolveContext } from './res';
import { Injector } from '../injector';

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
     * @param {...ProviderType[]} providers
     * @returns {T}
     * @memberof ResolveLifeScope
     */
    resolve<T>(injector: IInjector, token: Token<T> | ResolveOption<T>, ...providers: ProviderType[]): T {
        providers.unshift({ provide: INJECTOR, useValue: injector }, { provide: Injector, useValue: injector }, { provide: InjectorProxyToken, useValue: injector.getProxy()});
        let ctx = {
            injector,
            ... (isToken(token) ? { token: token } : token),
            providers: injector.get(PROVIDERS).inject(...providers)
        } as ResolveContext;
    
        this.execute(ctx);
        const instance = ctx.instance;
        // clean
        lang.cleanObj(ctx);
        return instance;
    }
}
