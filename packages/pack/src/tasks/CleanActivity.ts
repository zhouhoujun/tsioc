import { Expression, Src, Task, Activity, TemplateOption } from '@tsdi/activities';
import { NodeActivityContext } from '../core';
import { Input } from '@tsdi/boot';

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


    constructor(@Input() clean: Expression<Src>) {
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
