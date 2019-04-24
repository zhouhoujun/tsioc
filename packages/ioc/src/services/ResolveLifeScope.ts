import { LifeScope } from './LifeScope';
import { ResolveActionContext, IocResolveScope } from '../actions';
import { Token } from '../types';
import { ProviderTypes } from '../providers';

export class ResolveLifeScope<T> extends LifeScope<ResolveActionContext<T>> {

    execute(ctx: ResolveActionContext<any>, next?: () => void): void {
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
        this.container.get(ResolveLifeScope).execute(ctx);
        return ctx.instance;
    }
}
