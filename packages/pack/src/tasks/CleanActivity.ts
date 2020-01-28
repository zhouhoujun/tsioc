import { Input, Binding } from '@tsdi/components';
import { Expression, Src, Task, Activity, TemplateOption } from '@tsdi/activities';
import { NodeActivityContext, NodeExpression } from '../NodeActivityContext';

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
    clean: Binding<NodeExpression<Src>>
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

    @Input() clean: Expression<Src>;

    async execute(ctx: NodeActivityContext): Promise<void> {
        let clean = await ctx.resolveExpression(this.clean);
        if (clean) {
            await ctx.platform.del(ctx.platform.normalizeSrc(clean), { force: true, cwd: ctx.platform.getRootPath() });
        }
    }
}
