import { ActivityContext, Expression, ConditionOption, ActivityOption } from '../core';
import { Task } from '../decorators';
import { ControlActivity } from './ControlActivity';



@Task('condition')
export class ConditionActivity<T extends ActivityContext> extends ControlActivity<T> {

    protected condition: Expression<boolean>;

    protected initCondition(option: ConditionOption<T>) {
        if (option.condition) {
            this.condition = option.condition;
            this.initBody(option.body);
        }
    }

    async init(option: ActivityOption<T>) {
        this.initCondition(option as ConditionOption<T>);
    }

    async execute(ctx: T, next?: () => Promise<void>): Promise<void> {
        if (this.vaild(ctx)) {
            await this.whenTrue(ctx, next);
        } else {
            await this.whenFalse(ctx, next);
        }
    }

    protected async vaild(ctx: T): Promise<boolean> {
        let condition = await this.resolveExpression(this.condition, ctx);
        return condition;
    }

    protected async whenTrue(ctx: T, next?: () => Promise<void>): Promise<void> {
        super.execute(ctx, next);
    }

    protected async whenFalse(ctx: T, next?: () => Promise<void>): Promise<void> {
        if (next) {
            await next();
        }
    }
}
