import { ObjectMap } from '../types';
import { IocCompositeAction } from './IocCompositeAction';
import { RegisterActionContext, CTX_CURR_DECOR, CTX_CURR_DECOR_SCOPE } from './RegisterActionContext';
import { DecoratorScopes, DecoratorsRegisterer } from './DecoratorsRegisterer';


export abstract class IocDecoratorScope<T extends RegisterActionContext> extends IocCompositeAction<T> {
    execute(ctx: T, next?: () => void): void {
        if (!this.isCompleted(ctx)) {
            this.getDecorators(ctx)
                .forEach(dec => {
                    ctx.setContext(CTX_CURR_DECOR, dec);
                    ctx.setContext(CTX_CURR_DECOR_SCOPE, this.getDecorScope());
                    super.execute(ctx);
                    this.done(ctx);
                });
        }
        next && next();
    }

    protected done(ctx: T): boolean {
        return this.getState(ctx, this.getDecorScope())[ctx.getContext(CTX_CURR_DECOR)] = true;
    }
    protected isCompleted(ctx: T): boolean {
        return !Object.values(this.getState(ctx, this.getDecorScope())).some(inj => !inj);
    }
    protected getDecorators(ctx: T): string[] {
        let reg = this.getScopeRegisterer();
        let scope = this.getDecorScope();
        let states = this.getState(ctx, scope);
        return reg.getRegisterer(scope)
            .getDecorators()
            .filter(dec => states[dec] === false);
    }

    protected abstract getState(ctx: T, dtype: DecoratorScopes): ObjectMap<boolean>;
    protected abstract getScopeRegisterer(): DecoratorsRegisterer;
    protected abstract getDecorScope(): DecoratorScopes;
}
