import { IocCompositeAction } from './IocCompositeAction';
import { RegisterActionContext } from './RegisterActionContext';
import { DecoratorType } from '../factories';


export abstract class IocDecoratorScope extends IocCompositeAction<RegisterActionContext> {
    execute(ctx: RegisterActionContext, next?: () => void): void {
        this.initDecoratorScope(ctx);
        if (!this.isCompleted(ctx)) {
            Object.keys(this.getDecorators(ctx))
                .filter(dec => this.filter(ctx, dec))
                .forEach(dec => {
                    ctx.currDecoractor = dec;
                    ctx.currDecorType = this.getDecorType();
                    super.execute(ctx, next);
                    this.done(ctx);
                });
        }
    }

    protected initDecoratorScope(ctx: RegisterActionContext): void {

    }

    protected abstract done(ctx: RegisterActionContext): void;
    protected abstract isCompleted(ctx: RegisterActionContext): boolean;
    protected abstract getDecorators(ctx: RegisterActionContext): string[];
    protected abstract getDecorType(): DecoratorType;
    protected abstract filter(ctx: RegisterActionContext, dec: string): boolean;
    abstract setup();
}
