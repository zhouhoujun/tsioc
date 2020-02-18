import { isString } from '@tsdi/ioc';
import { Input, Binding } from '@tsdi/components';
import { Src, Task, TemplateOption, ActivityType, Activities } from '@tsdi/activities';
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
            activity: 'src',
            src: 'binding: src'
        },
        {
            activity: Activities.if,
            condition: (ctx, bind) => bind.getScope<AssetActivity>().sourcemap,
            body: {
                name: 'sourcemap-init',
                activity: Activities.execute,
                action: (ctx: NodeActivityContext, bind) => {
                    let framework = bind.getScope<AssetActivity>().framework || require('gulp-sourcemaps');
                    return ctx.injector.get(TransformService).executePipe(ctx, ctx.getData(), framework.init())
                }
            }
        },
        {
            activity: 'pipes',
            pipes: 'binding: pipes'
        },
        {
            activity: Activities.if,
            condition: 'binding: sourcemap',
            body: {
                name: 'sourcemap-write',
                activity: Activities.execute,
                action: (ctx: NodeActivityContext, bind) => {
                    let scope = bind.getScope<AssetActivity>();
                    let framework = scope.framework || require('gulp-sourcemaps');
                    return ctx.injector.get(TransformService).executePipe(ctx, ctx.getData(), framework.write(isString(scope.sourcemap) ? scope.sourcemap : './sourcemaps'))
                }
            }
        },
        {
            activity: 'dist',
            dist: 'binding: dist',
        }
    ]
})
export class AssetActivity {
    @Input() src: NodeExpression<Src>;
    @Input() dist: NodeExpression<string>;
    @Input() sourcemap: string | boolean;
    @Input('sourceMapFramework') framework: any;
    @Input('pipes') pipes: ActivityType<ITransform>[];
}
