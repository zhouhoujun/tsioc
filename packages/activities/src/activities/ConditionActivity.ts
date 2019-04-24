import { Task } from '../decorators';
import { ActivityContext, Expression, ConditionTemplate } from '../core';
import { BodyActivity } from './BodyActivity';


/**
 * condition activity.
 *
 * @export
 * @class ConditionActivity
 * @extends {ControlActivity<T>}
 * @template T
 */
@Task('condition')
export class ConditionActivity<T extends ActivityContext> extends BodyActivity<T> {

    condition: Expression<boolean>;

    async init(option: ConditionTemplate<T>) {
        this.condition = option.condition;
        await super.init(option);
    }

    async execute(ctx: T): Promise<void> {
        if (this.vaildate(ctx)) {
            await this.whenTrue(ctx);
        } else {
            await this.whenFalse(ctx);
        }
    }

    protected async vaildate(ctx: T): Promise<boolean> {
        return await this.resolveExpression(this.condition, ctx);
    }

    protected async whenTrue(ctx: T, next?: () => Promise<void>): Promise<void> {
        await this.execBody(ctx);
    }

    protected async whenFalse(ctx: T, next?: () => Promise<void>): Promise<void> {
        if (next) {
            await next();
        }
    }
}
