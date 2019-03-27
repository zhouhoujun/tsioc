import { IocCompositeAction } from './IocCompositeAction';
import { RegisterActionContext } from './RegisterActionContext';
import { DecoratorType } from '../factories';
import { ObjectMap } from '../types';
import { DecoratorRegisterer } from '../services';
import { lang } from '../utils';


export abstract class IocDecoratorScope extends IocCompositeAction<RegisterActionContext> {
    execute(ctx: RegisterActionContext, next?: () => void): void {
        if (!this.isCompleted(ctx)) {
            this.getDecorators(ctx)
                .forEach(dec => {
                    ctx.currDecoractor = dec;
                    ctx.currDecorType = this.getDecorType();
                    super.execute(ctx);
                    this.done(ctx);
                });
        }
        next && next();
    }

    protected done(ctx: RegisterActionContext): boolean {
        return this.getState(ctx, this.getDecorType())[ctx.currDecoractor] = true;
    }
    protected isCompleted(ctx: RegisterActionContext): boolean {
        return Object.values(this.getState(ctx, this.getDecorType())).some(inj => inj);
    }
    protected getDecorators(ctx: RegisterActionContext): string[] {
        let reg = this.getRegisterer();
        let states = this.getState(ctx, this.getDecorType());
        return Array.from(reg.getDecoratorMap(this.getDecorType()).keys())
            .filter(dec => states[dec] === false);
    }

    protected abstract getState(ctx: RegisterActionContext, dtype: DecoratorType): ObjectMap<boolean>;
    protected abstract getRegisterer(): DecoratorRegisterer;
    protected abstract getDecorType(): DecoratorType;
    abstract setup();
}
