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
     * @type {Src}
     * @memberof SourceActivityOption
     */
    src: Binding<Src>;

    /**
     * src option
     *
     * @type {DestOptions}
     * @memberof DistActivityOption
     */
    srcOptions?: Binding<SrcOptions>;
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

    @Input() src: Src;
    @Input('srcOptions') options: SrcOptions;

    async execute(ctx: NodeActivityContext): Promise<ITransform> {
        if (this.src) {
            return src(ctx.platform.normalizeSrc(this.src), Object.assign({ cwd: ctx.platform.getRootPath() }, this.options || {}));
        }
    }
}
