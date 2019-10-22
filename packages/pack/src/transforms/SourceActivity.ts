import { Task, Src, TemplateOption } from '@tsdi/activities';
import { Input, Binding } from '@tsdi/components';
import { SrcOptions, src } from 'vinyl-fs';
import { NodeActivityContext, NodeExpression } from '../core';
import { TransformActivity } from './TransformActivity';



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

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let strSrc = await this.resolveExpression(this.src, ctx);
        if (strSrc) {
            let options = await this.resolveExpression(this.options, ctx);
            this.result.value = src(ctx.platform.normalizeSrc(strSrc), Object.assign({cwd: ctx.platform.getRootPath()}, options || {}));
        }
    }
}
