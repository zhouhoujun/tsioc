import { isNil } from '../utils/chk';
import { IInjector } from '../IInjector';
import { isToken, ProviderType, Token } from '../tokens';
import { INJECTOR, PROVIDERS } from '../utils/tk';
import * as rla from './res-act';
import { ResolveContext, ResolveOption } from './res';
import { cleanObj } from '../utils/lang';

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
        if (isNil(ctx.instance)) {
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
     */
    resolve<T>(injector: IInjector, token: Token<T> | ResolveOption<T>, ...providers: ProviderType[]): T {
        let ctx = {
            injector,
            ... (isToken(token) ? { token: token } : token),
            providers: injector.get(PROVIDERS).inject(...providers)
        } as ResolveContext;
        if (!ctx.providers.hasTokenKey(INJECTOR)) {
            ctx.providers.inject({ provide: INJECTOR, useValue: injector });
        }
        this.execute(ctx);
        const instance = ctx.instance;
        // clean
        cleanObj(ctx);
        return instance;
    }
}
