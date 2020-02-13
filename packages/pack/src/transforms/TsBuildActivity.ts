import { ObjectMap, isString } from '@tsdi/ioc';
import { Input, Binding } from '@tsdi/components';
import { Task, Src, Activities } from '@tsdi/activities';
import { CompilerOptions } from 'typescript';
import { AssetActivityOption, AssetActivity } from './AssetActivity';
import { TransformService } from './TransformActivity';
import { classAnnotations } from '@tsdi/annotations';
import { NodeExpression, NodeActivityContext } from '../NodeActivityContext';
import { ITransform } from '../ITransform';
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
            activity: 'src',
            src: 'binding: src',
        },
        {
            activity: 'annotation',
            annotationFramework: 'binding: annotationFramework',
            annotation: 'binding: annotation'
        },
        {
            activity: Activities.if,
            condition: (ctx, scope: TsBuildActivity) => scope.sourcemap,
            body: {
                name: 'sourcemap-init',
                activity: Activities.execute,
                action: (ctx: NodeActivityContext, scope: TsBuildActivity) => {
                    let framework = scope.framework || require('gulp-sourcemaps');
                    return ctx.injector.get(TransformService).executePipe(ctx, ctx.output, framework.init())
                }
            }
        },
        {
            activity: Activities.if,
            condition: (ctx, scope: TsBuildActivity) => scope.beforePipes?.length > 0,
            body: {
                activity: 'pipes',
                pipes: 'binding: beforePipes'
            }
        },

        {
            activity: Activities.execute,
            name: 'tscompile',
            action: async (ctx: NodeActivityContext, scope: TsBuildActivity) => {
                if (!scope.tsconfig) {
                    return;
                }
                let tsconfig = await ctx.resolveExpression(scope.tsconfig);
                let tsCompile;
                if (isString(tsconfig)) {
                    let tsProject = ts.createProject(ctx.platform.relativeRoot(tsconfig));
                    tsCompile = tsProject();
                } else {
                    let tsProject = ts.createProject(ctx.platform.relativeRoot('./tsconfig.json'), tsconfig);
                    tsCompile = tsProject();
                }
                return await ctx.injector.get(TransformService).executePipe(ctx, ctx.output, tsCompile);
            }
        },
        {
            activity: 'dist',
            input: 'ctx.input | dts',
            dist: 'binding: dts',
        },
        {
            activity: Activities.if,
            condition: ctx => ctx.scope.js,
            input: 'ctx.input | tsjs',
            body: [
                {
                    activity: 'pipes',
                    pipes: 'binding: pipes'
                },
                {
                    activity: 'uglify',
                    uglify: 'binding: uglify',
                    uglifyOptions: 'binding: uglifyOptions'
                },
                {
                    activity: Activities.if,
                    condition: (ctx, scope: TsBuildActivity) => scope.sourcemap,
                    body: {
                        name: 'sourcemap-write',
                        activity: Activities.execute,
                        action: (ctx: NodeActivityContext, scope: TsBuildActivity) => {
                            let framework = scope.framework || require('gulp-sourcemaps');
                            return ctx.injector.get(TransformService).executePipe(ctx, ctx.output, framework.write(isString(scope.sourcemap) ? ctx.scope.sourcemap : './sourcemaps'))
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
export class TsBuildActivity extends AssetActivity {
    @Input() dts: NodeExpression<string>;
    @Input('annotationFramework', classAnnotations) annotationFramework: NodeExpression<ITransform>;

    @Input('tsconfig', './tsconfig.json') tsconfig: NodeExpression<string | ObjectMap>;
    @Input() uglify: NodeExpression<boolean>;
    @Input('uglifyOptions') uglifyOptions: NodeExpression;
}

