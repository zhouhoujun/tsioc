import { Input, Binding } from '@tsdi/components';
import { Src, Task, TemplateOption } from '@tsdi/activities';
import { NodeActivityContext } from '../NodeActivityContext';
import { NodeActivity } from '../NodeActivity';

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
    clean: Binding<Src>
}

/**
 * Source activity.
 *
 * @export
 * @class CleanActivity
 * @extends {Activity}
 */
@Task('clean, [clean]')
export class CleanActivity extends NodeActivity<void> {

    @Input() clean: Src;

    async execute(ctx: NodeActivityContext): Promise<void> {
        let clean = this.clean;
        if (clean) {
            await ctx.platform.del(ctx.platform.normalizeSrc(clean), { force: true, cwd: ctx.platform.getRootPath() });
        }
    }
}
