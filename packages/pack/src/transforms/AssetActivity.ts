import { isString } from '@tsdi/ioc';
import { Input, Binding } from '@tsdi/components';
import { Src, Task, TemplateOption, ActivityType, Activities } from '@tsdi/activities';
import { NodeExpression, NodeActivityContext } from '../NodeActivityContext';
import { ITransform } from '../ITransform';
const sourcemaps = require('gulp-sourcemaps');

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
    src?: Binding<Src>;
    /**
     * sourcemap.
     *
     * @type {(Binding<string | boolean>)}
     * @memberof AssetActivityOption
     */
    sourcemap?: Binding<string | boolean>;
    /**
     * shell args.
     *
     * @type {Binding<string>}
     * @memberof AssetActivityOption
     */
    dist?: Binding<string>;
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
            condition: 'binding: sourcemap',
            body: {
                name: 'sourcemap-init',
                activity: Activities.execute,
                action: (ctx: NodeActivityContext, bind) => {
                    let framework = bind.getScope<AssetActivity>().framework || sourcemaps;
                    return  ctx.getData<ITransform>().pipe(framework.init())
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
                    let framework = scope.framework || sourcemaps;
                    return ctx.getData<ITransform>().pipe(framework.write(isString(scope.sourcemap) ? scope.sourcemap : './sourcemaps'))
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
    @Input() src: Src;
    @Input() dist: string;
    @Input() sourcemap: string | boolean;
    @Input('sourceMapFramework') framework: any;
    @Input('pipes') pipes: ActivityType<ITransform>[];
}
