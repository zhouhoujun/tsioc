import { isString } from '@tsdi/ioc';
import { Input, Binding } from '@tsdi/components';
import { Src, Task, TemplateOption, ActivityType, Activities } from '@tsdi/activities';
import { StreamActivity } from './StreamActivity';
import { TransformService } from './TransformActivity';
import { NodeExpression, NodeActivityContext } from '../NodeActivityContext';
import { ITransform } from '../ITransform';


/**
 * shell activity config.
 *
 * @export
 * @interface AssetActivityOption
 * @extends {ActivityConfigure}
 */
export interface AssetActivityOption extends TemplateOption {
    /**
     * shell cmd
     *
     * @type {Binding<Src>}
     * @memberof AssetActivityOption
     */
    src?: Binding<NodeExpression<Src>>;
    /**
     * sourcemap.
     *
     * @type {(Binding<NodeExpression<string | boolean>>)}
     * @memberof AssetActivityOption
     */
    sourcemap?: Binding<NodeExpression<string | boolean>>;
    /**
     * shell args.
     *
     * @type {Binding<Src>}
     * @memberof AssetActivityOption
     */
    dist?: Binding<NodeExpression<Src>>;
    /**
     * stream pipe works after asset loaded.
     *
     * @type {Binding<ActivityType<ITransform>[]>}
     * @memberof ShellActivityOption
     */
    beforePipes?: Binding<ActivityType<ITransform>[]>;
    /**
     *  stream pipe works for asset transform.
     *
     * @type {Binding<ActivityType<ITransform>[]>}
     * @memberof ShellActivityOption
     */
    pipes?: Binding<ActivityType<ITransform>[]>;

    sourceMapFramework?: Binding<any>;

}


@Task({
    selector: 'asset',
    template: [
        {
            activity: Activities.if,
            condition: ctx => ctx.component.autoClean,
            body: {
                activity: 'clean',
                clean: 'binding: dist'
            }
        },
        {
            activity: 'src',
            src: 'binding: src',
        },
        {
            activity: Activities.execute,
            action: ctx => {
                if (ctx.component.beforePipes) {
                    return ctx.component.beforePipes.run(ctx);
                }
            }
        },
        {
            activity: Activities.if,
            condition: ctx => ctx.component.sourcemap,
            body: {
                activity: Activities.execute,
                action: (ctx: NodeActivityContext) => {
                    let framework = ctx.component.framework || require('gulp-sourcemaps');
                    return ctx.injector.getInstance(TransformService).executePipe(ctx, ctx.output, framework.init())
                }
            }
        },
        {
            activity: Activities.execute,
            action: ctx => {
                if (ctx.component.streamPipes) {
                    return ctx.component.streamPipes.run(ctx);
                }
            }
        },
        {
            activity: Activities.if,
            condition: ctx => ctx.component.sourcemap,
            body: {
                activity: Activities.execute,
                action: (ctx: NodeActivityContext) => {
                    let framework = ctx.component.framework || require('gulp-sourcemaps');
                    return ctx.injector.get(TransformService).executePipe(ctx, ctx.output, framework.write(isString(ctx.component.sourcemap) ? ctx.component.sourcemap : './sourcemaps'))
                }
            }
        },
        {
            activity: 'dist',
            src: 'binding: dist',
        }
    ]
})
export class AssetActivity {
    @Input() autoClean: boolean;
    @Input() src: NodeExpression<Src>;
    @Input() dist: NodeExpression<string>;
    @Input() sourcemap: string | boolean;
    @Input('sourceMapFramework') framework: any
    @Input('beforePipes') beforePipes: StreamActivity;
    @Input('pipes') streamPipes: StreamActivity;
}
