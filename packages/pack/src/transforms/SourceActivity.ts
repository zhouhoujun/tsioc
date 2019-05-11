import { NodeActivityContext } from '../core';
import { Task, Src, Expression, TemplateOption } from '@tsdi/activities';
import { SrcOptions, src } from 'vinyl-fs';
import { Input } from '@tsdi/boot';
import { PipeActivity } from './PipeActivity';



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
     * @type {Expression<Src>}
     * @memberof SourceActivityOption
     */
    src: Expression<Src>;

    /**
     * src option
     *
     * @type {Expression<DestOptions>}
     * @memberof DistActivityOption
     */
    srcOptions?: Expression<SrcOptions>;
}

/**
 * Source activity.
 *
 * @export
 * @class SourceActivity
 * @extends {TransformActivity}
 */
@Task('src, [src]')
export class SourceActivity extends PipeActivity {

    @Input()
    protected src: Expression<Src>;

    @Input('srcOptions')
    protected options: Expression<SrcOptions>;

    constructor(@Input() src: Expression<Src>) {
        super()
        this.src = src;
    }

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let strSrc = await this.resolveExpression(this.src, ctx);
        if (strSrc) {
            let options = await this.resolveExpression(this.options, ctx);
            this.result.value = src(ctx.toRootSrc(strSrc), options || undefined);
        }
    }
}
