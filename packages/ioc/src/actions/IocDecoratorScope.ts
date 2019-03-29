import { ObjectMap } from '../types';
import { DecoratorScopeRegisterer, DecoratorScopes } from '../services';
import { IocCompositeAction } from './IocCompositeAction';
import { DecoratorActionContext } from './DecoratorActionContext';


export abstract class IocDecoratorScope<T extends DecoratorActionContext> extends IocCompositeAction<T> {
    execute(ctx: T, next?: () => void): void {
        if (!this.isCompleted(ctx)) {
            this.getDecorators(ctx)
                .forEach(dec => {
                    ctx.currDecoractor = dec;
                    ctx.currDecorScope = this.getDecorScope();
                    super.execute(ctx);
                    this.done(ctx);
                });
        }
        next && next();
    }

    protected done(ctx: T): boolean {
        return this.getState(ctx, this.getDecorScope())[ctx.currDecoractor] = true;
    }
    protected isCompleted(ctx: T): boolean {
        return Object.values(this.getState(ctx, this.getDecorScope())).some(inj => inj);
    }
    protected getDecorators(ctx: T): string[] {
        let reg = this.getScopeRegisterer();
        let states = this.getState(ctx, this.getDecorScope());
        return Array.from(reg.getRegisterer(this.getDecorScope()).getActions().keys())
            .filter(dec => states[dec] === false);
    }

    protected abstract getState(ctx: T, dtype: DecoratorScopes): ObjectMap<boolean>;
    protected abstract getScopeRegisterer(): DecoratorScopeRegisterer;
    protected abstract getDecorScope(): DecoratorScopes;
}
