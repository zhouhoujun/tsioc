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
            activity: Activities.if,
            condition: ctx => ctx.scope.autoClean,
            body: {
                activity: 'clean',
                clean: 'binding: dist'
            }
        },
        {
            activity: 'src',
            src: 'binding: src'
        },
        {
            activity: 'pipes',
            pipes: ctx => [
                ...(ctx.scope.beforePipes || []),
                ctx.scope.sourcemap ? (ctx: NodeActivityContext) => {
                    let framework = ctx.scope.framework || require('gulp-sourcemaps');
                    return ctx.injector.getInstance(TransformService).executePipe(ctx, ctx.output, framework.init())
                } : null,
                ...(ctx.scope.pipes || []),
                ctx.scope.sourcemap ? (ctx: NodeActivityContext) => {
                    let framework = ctx.scope.framework || require('gulp-sourcemaps');
                    return ctx.injector.get(TransformService).executePipe(ctx, ctx.output, framework.write(isString(ctx.scope.sourcemap) ? ctx.scope.sourcemap : './sourcemaps'))
                } : null
            ]
        },
        // {
        //     activity: Activities.if,
        //     condition: ctx => ctx.scope.beforePipes?.length > 0,
        //     body: {
        //         activity: 'pipes',
        //         pipes: 'binding: beforePipes'
        //     }
        // },
        // {
        //     activity: Activities.if,
        //     condition: ctx => ctx.scope.sourcemap,
        //     body: {
        //         activity: Activities.execute,
        //         action: (ctx: NodeActivityContext) => {
        //             let framework = ctx.scope.framework || require('gulp-sourcemaps');
        //             return ctx.injector.getInstance(TransformService).executePipe(ctx, ctx.output, framework.init())
        //         }
        //     }
        // },
        // {
        //     activity: Activities.if,
        //     condition: ctx => ctx.scope.pipes?.length > 0,
        //     body: {
        //         activity: 'pipes',
        //         pipes: 'binding: pipes'
        //     }
        // },
        // {
        //     activity: Activities.if,
        //     condition: ctx => ctx.scope.sourcemap,
        //     body: {
        //         activity: Activities.execute,
        //         action: (ctx: NodeActivityContext) => {
        //             let framework = ctx.scope.framework || require('gulp-sourcemaps');
        //             return ctx.injector.get(TransformService).executePipe(ctx, ctx.output, framework.write(isString(ctx.scope.sourcemap) ? ctx.scope.sourcemap : './sourcemaps'))
        //         }
        //     }
        // },
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
    @Input('beforePipes') beforePipes: ActivityType<ITransform>[];
    @Input('pipes') pipes: ActivityType<ITransform>[];
}
