import { Input, Expression, Src, Task, Activity, TemplateOption } from '@tsdi/activities';
import { Inject } from '@tsdi/ioc';
import { NodeActivityContext } from '../core';

/**
 * clean activity template option.
 *
 * @export
 * @interface CleanActivityOption
 * @extends {TemplateOption}
 */
export interface CleanActivityOption extends TemplateOption {
    /**
     * clean source.
     *
     * @type {Expression<Src>}
     * @memberof CleanActivityOption
     */
    clean: Expression<Src>
}

/**
 * Source activity.
 *
 * @export
 * @class CleanActivity
 * @extends {Activity}
 */
@Task('clean, [clean]')
export class CleanActivity extends Activity<void> {

    @Input()
    protected clean: Expression<Src>;


    constructor(
        @Inject('[clean]') clean: Expression<Src>) {
        super()
        this.clean = clean;
    }

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let clean = await this.resolveExpression(this.clean, ctx);
        if (clean) {
            await ctx.del(ctx.toRootSrc(clean));
        }
    }
}
