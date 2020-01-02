import { IocCompositeAction } from './IocCompositeAction';
import { RegisterActionContext } from './RegisterActionContext';
import { DecoratorScopes, DecoratorsRegisterer } from './DecoratorsRegisterer';
import { CTX_CURR_DECOR, CTX_CURR_DECOR_SCOPE } from '../context-tokens';


export abstract class IocDecoratorScope<T extends RegisterActionContext> extends IocCompositeAction<T> {
    execute(ctx: T, next?: () => void): void {
        this.getDecorators(ctx)
            .forEach(dec => {
                ctx.set(CTX_CURR_DECOR, dec);
                ctx.set(CTX_CURR_DECOR_SCOPE, this.getDecorScope());
                super.execute(ctx);
            });
        next && next();
    }

    protected getDecorators(ctx: T): string[] {
        let reg = this.getScopeRegisterer();
        let scope = this.getDecorScope();
        let filters = this.hasDecors(ctx, scope);
        return reg.getRegisterer(scope)
            .getDecorators()
            .filter(d => filters.indexOf(d) >= 0);
    }

    protected abstract hasDecors(ctx: T, scope: DecoratorScopes): string[]


    protected abstract getScopeRegisterer(): DecoratorsRegisterer;
    protected abstract getDecorScope(): DecoratorScopes;
}
