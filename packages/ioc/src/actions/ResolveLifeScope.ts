import { Token } from '../types';
import { ProviderTypes } from '../providers';
import { ResolveActionContext } from './ResolveActionContext';
import { IocResolveScope } from './IocResolveScope';

export class ResolveLifeScope<T> extends IocResolveScope<ResolveActionContext<T>> {

    execute(ctx: ResolveActionContext<any>, next?: () => void): void {
        if (!ctx.instance) {
            super.execute(ctx, next);
        }
    }

    setup() {
        this.use(IocResolveScope, true);
    }

    /**
     * resolve token in resolve chain.
     *
     * @template T
     * @param {(Token<T> | ResolveActionContext<T>)} token
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof ResolveLifeScope
     */
    resolve<T>(token: Token<T> | ResolveActionContext<T>, ...providers: ProviderTypes[]): T {
        let ctx: ResolveActionContext<T>;
        if (token instanceof ResolveActionContext) {
            ctx = token;
            ctx.providers = (ctx.providers || []).concat(providers);
        } else {
            ctx = ResolveActionContext.parse({ token: token, providers: providers });
        }
        this.container.getActionRegisterer().get(ResolveLifeScope).execute(ctx);
        return ctx.instance;
    }
}
