import { isNil } from '../utils/chk';
import { IInjector, ResolveOption } from '../IInjector';
import { isToken, ProviderType, Token } from '../tokens';
import { INJECTOR, PROVIDERS } from '../utils/tk';
import * as rla from './res-act';
import { ResolveContext } from './res';
import { cleanObj } from '../utils/lang';
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
        providers.unshift({ provide: INJECTOR, useValue: injector }, { provide: Injector, useValue: injector });
        let ctx = {
            injector,
            ... (isToken(token) ? { token: token } : token),
            providers: injector.get(PROVIDERS).inject(...providers)
        } as ResolveContext;

        this.execute(ctx);
        const instance = ctx.instance;
        // clean
        cleanObj(ctx);
        return instance;
    }
}
