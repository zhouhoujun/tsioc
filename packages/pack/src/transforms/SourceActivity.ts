import { Input, Binding } from '@tsdi/components';
import { Task, Src, TemplateOption } from '@tsdi/activities';
import { SrcOptions, src } from 'vinyl-fs';
import { TransformActivity } from './TransformActivity';
import { NodeExpression, NodeActivityContext } from '../NodeActivityContext';
import { ITransform } from '../ITransform';



/**
 * source activity template option.
 *
 * @export
 * @interface SourceActivityOption
 * @extends {TemplateOption}
 */
export interface SourceActivityOption extends TemplateOption {
    /**
     * source.
     *
     * @type {NodeExpression<Src>}
     * @memberof SourceActivityOption
     */
    src: Binding<NodeExpression<Src>>;

    /**
     * src option
     *
     * @type {NodeExpression<DestOptions>}
     * @memberof DistActivityOption
     */
    srcOptions?: Binding<NodeExpression<SrcOptions>>;
}

/**
 * Source activity.
 *
 * @export
 * @class SourceActivity
 * @extends {TransformActivity}
 */
@Task('src, [src]')
export class SourceActivity extends TransformActivity {

    @Input() src: NodeExpression<Src>;
    @Input('srcOptions') options: NodeExpression<SrcOptions>;

    async execute(ctx: NodeActivityContext): Promise<ITransform> {
        let strSrc = await ctx.resolveExpression(this.src);
        if (strSrc) {
            let options = await ctx.resolveExpression(this.options);
            return src(ctx.platform.normalizeSrc(strSrc), Object.assign({ cwd: ctx.platform.getRootPath() }, options || {}));
        }
    }
}
