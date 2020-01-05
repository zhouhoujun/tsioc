import { ObjectMap, isString } from '@tsdi/ioc';
import { Input, Binding } from '@tsdi/components';
import { Task, Src, Activities } from '@tsdi/activities';
import { NodeActivityContext, NodeExpression, ITransform } from '../core';
import { CompilerOptions } from 'typescript';
import { AssetActivityOption } from './AssetActivity';
import { StreamActivity } from './StreamActivity';
import { TransformService } from './TransformActivity';
import { classAnnotations } from '@tsdi/annotations';
const ts = require('gulp-typescript');

/**
 * ts build option.
 *
 * @export
 * @interface TsBuildOption
 * @extends {AssetActivityOption}
 */
export interface TsBuildOption extends AssetActivityOption {
    test?: Binding<NodeExpression<Src>>;
    annotation?: Binding<NodeExpression<boolean>>;
    tsconfig?: Binding<NodeExpression<string | CompilerOptions>>;
    dts?: Binding<NodeExpression<string>>;
    uglify?: Binding<NodeExpression<boolean>>;
    uglifyOptions?: Binding<NodeExpression>;
}

@Task({
    selector: 'ts',
    template: [
        {
            activity: 'test',
            src: 'binding: test'
        },
        {
            activity: 'clean',
            clean: 'binding: dist'
        },
        {
            activity: 'src',
            src: 'binding: src',
        },
        {
            activity: 'annotation',
            annotationFramework: 'binding: annotationFramework',
            annotation: 'binding: annotation'
        },
        {
            activity: Activities.execute,
            action: ctx => {
                if (ctx.scope.beforePipes) {
                    return ctx.scope.beforePipes.run(ctx);
                }
            }
        },
        {
            activity: Activities.if,
            condition: ctx => ctx.scope.sourcemap,
            body: {
                activity: Activities.execute,
                action: (ctx: NodeActivityContext, activity) => {
                    let framework = ctx.scope.framework || require('gulp-sourcemaps');
                    return ctx.injector.get(TransformService).executePipe(ctx, activity.result, framework.init())
                }
            }
        },
        {
            activity: Activities.execute,
            action: async (ctx: NodeActivityContext, activity) => {
                if (!ctx.scope.tsconfig) {
                    return;
                }
                let tsconfig = await ctx.resolveExpression(ctx.scope.tsconfig);
                let tsCompile;
                if (isString(tsconfig)) {
                    let tsProject = ts.createProject(ctx.platform.relativeRoot(tsconfig));
                    tsCompile = tsProject();
                } else {
                    let tsProject = ts.createProject(ctx.platform.relativeRoot('./tsconfig.json'), tsconfig);
                    tsCompile = tsProject();
                }
                return await ctx.injector.get(TransformService).executePipe(ctx, activity.result, tsCompile);
            }
        },
        {
            activity: Activities.if,
            condition: ctx => ctx.scope.dts,
            body: {
                activity: 'dist',
                pipe: 'dts',
                dist: 'binding: dts',
            }
        },
        {
            activity: Activities.if,
            condition: ctx => ctx.scope.js,
            pipe: 'tsjs',
            body: [
                {
                    activity: Activities.execute,
                    action: ctx => {
                        if (ctx.scope.streamPipes) {
                            return ctx.scope.streamPipes.run(ctx);
                        }
                    }
                },
                {
                    activity: 'uglify',
                    uglify: 'binding: uglify',
                    uglifyOptions: 'binding: uglifyOptions'
                },
                {
                    activity: Activities.if,
                    condition: ctx => ctx.scope.sourcemap,
                    body: {
                        activity: Activities.execute,
                        action: (ctx: NodeActivityContext, activity) => {
                            let framework = ctx.scope.framework || require('gulp-sourcemaps');
                            return ctx.injector.get(TransformService).executePipe(ctx, activity.result, framework.write(isString(ctx.scope.sourcemap) ? ctx.scope.sourcemap : './sourcemaps'))
                        }
                    }
                },
                {
                    activity: 'dist',
                    dist: 'binding: dist',
                }
            ]
        }
    ]
})
export class TsBuildActivity {
    @Input() src: NodeExpression<Src>;
    @Input() dist: NodeExpression<string>;
    @Input() dts: NodeExpression<string>;
    @Input() sourcemap: string | boolean;
    @Input('sourceMapFramework') framework: any
    @Input('beforePipes') beforePipes: StreamActivity;
    @Input('pipes') streamPipes: StreamActivity;
    @Input() annotation: NodeExpression<boolean>;
    @Input('annotationFramework', classAnnotations) annotationFramework: NodeExpression<ITransform>;

    @Input('tsconfig', './tsconfig.json') tsconfig: NodeExpression<string | ObjectMap>;
    @Input() uglify: NodeExpression<boolean>;
    @Input('uglifyOptions') uglifyOptions: NodeExpression;
}

