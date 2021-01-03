import { isNil } from '../utils/chk';
import { IInjector, ResolveOption } from '../IInjector';
import { isToken, ProviderType, Token } from '../tokens';
import { INJECTOR } from '../utils/tk';
import * as rla from './res-act';
import { ResolveContext } from './res';
import { cleanObj } from '../utils/lang';
import { getProvider, Injector } from '../injector';

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
        let option: ResolveOption<T>;
        if (isToken(token)) {
            option = { token };
        } else {
            option = token;
            if (option.providers) providers.unshift(...option.providers);
        }
        
        const ctx = {
            injector,
            ...option,
            providers: getProvider(injector, ...providers)
        } as ResolveContext;

        this.execute(ctx);
        const instance = ctx.instance;
        // clean
        cleanObj(ctx);
        return instance;
    }
}
