import { IocCompositeAction } from './IocAction';
import { RegContext } from './IocRegAction';
import { DecoratorScope } from '../types';
import { CTX_CURR_DECOR, CTX_CURR_DECOR_SCOPE } from '../context-tokens';


export abstract class IocDecorScope<T extends RegContext> extends IocCompositeAction<T> {
    execute(ctx: T, next?: () => void): void {
        this.getDecorators(ctx)
            .forEach(dec => {
                ctx.setValue(CTX_CURR_DECOR, dec);
                ctx.setValue(CTX_CURR_DECOR_SCOPE, this.getDecorScope());
                super.execute(ctx);
            });
        next && next();
    }

    protected getDecorators(ctx: T): string[] {
        let scope = this.getDecorScope();
        return this.getScopeDecorators(ctx, scope);
    }

    protected abstract getScopeDecorators(ctx: T, scope: DecoratorScope): string[]

    protected abstract getDecorScope(): DecoratorScope;
}
