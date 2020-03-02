import { ObjectMap, isString } from '@tsdi/ioc';
import { Input, Binding } from '@tsdi/components';
import { Task, Src, Activities, ActivityType } from '@tsdi/activities';
import { CompilerOptions } from 'typescript';
import { AssetActivityOption, AssetActivity } from './AssetActivity';
import { NodeExpression, NodeActivityContext } from '../NodeActivityContext';
import { ITransform, isTransform } from '../ITransform';
import * as through from 'through2';
import { TsComplie } from '../ts-complie';
import * as VFile from 'vinyl';
import { tsFileExp } from '../exps';
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const applySourceMap = require('vinyl-sourcemaps-apply');


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
            condition: 'binding: sourcemap',
            body: {
                name: 'sourcemap-init',
                activity: Activities.execute,
                action: (ctx: NodeActivityContext, bind) => {
                    let scope = bind.getScope<TsBuildActivity>();
                    let framework = scope.framework || sourcemaps;
                    return ctx.getData().pipe(framework.init());
                }
            }
        },
        {
            activity: Activities.if,
            condition: (ctx, bind) => bind.getScope<TsBuildActivity>().beforePipes?.length > 0,
            body: {
                activity: 'pipes',
                pipes: 'binding: beforePipes'
            }
        },
        {
            activity: Activities.execute,
            name: 'tscompile',
            action: async (ctx: NodeActivityContext, bind) => {
                let scope = bind.getScope<TsBuildActivity>();
                if (!scope.tsconfig) {
                    return;
                }
                const compile = ctx.injector.get(TsComplie);
                const tsconfig = await ctx.resolveExpression(scope.tsconfig);
                const dts = await ctx.resolveExpression(scope.dts);
                let setting: CompilerOptions;
                let jsonFile: string;
                if (!isString(tsconfig)) {
                    setting = tsconfig;
                    tsconfig.declaration = !!dts;
                } else {
                    jsonFile = tsconfig;
                    setting = { declaration: !!dts };
                }
                const compilerOptions = compile.createProject(ctx.platform.getRootPath(), ctx.platform.relativeRoot(jsonFile || './tsconfig.json'), setting);
                return ctx.getData<ITransform>().pipe(through.obj(function (file, encoding, callback) {
                    if (file.isNull()) {
                        return callback(null, file);
                    }

                    if (file.isStream()) {
                        return callback('doesn\'t support Streams');
                    }
                    let contents: string = file.contents.toString('utf8');
                    const result = compile.compile(file.relative, compilerOptions, contents);
                    if (result.dts) {
                        this.push(new VFile({
                            contents: new Buffer(result.dts),
                            cwd: file.cwd,
                            base: file.base.replace(tsFileExp, '.dts'),
                            path: file.path.replace(tsFileExp, '.dts')
                        }));
                    }
                    if (file.sourceMap && result.map) {
                        applySourceMap(file, JSON.parse(result.map));
                    }
                    file.contents = new Buffer(result.code);
                    callback(null, file);
                })).pipe(rename(path => {
                    if (path.extname === '.ts') {
                        path.extname = '.js';
                    } else if (path.extname === '.dts') {
                        path.extname = '.d.ts';
                    }
                    return path;
                }));
            }
        },
        {
            activity: Activities.if,
            externals: {
                data: 'ctx.getData() | tsjs'
            },
            condition: ctx => isTransform(ctx.getData()),
            body: [
                {
                    activity: 'pipes',
                    pipes: 'binding: pipes'
                },
                {
                    activity: 'if',
                    condition: 'binding: uglify',
                    body: {
                        activity: 'uglify',
                        uglifyOptions: 'binding: uglifyOptions'
                    }
                },
                {
                    activity: Activities.if,
                    condition: 'binding: sourcemap',
                    body: {
                        name: 'sourcemap-write',
                        activity: Activities.execute,
                        action: async (ctx: NodeActivityContext, bind) => {
                            let scope = bind.getScope<TsBuildActivity>();
                            let framework = scope.framework || sourcemaps;
                            return ctx.getData<ITransform>().pipe(framework.write(isString(scope.sourcemap) ? scope.sourcemap : './sourcemaps'));
                        }
                    }
                },
                {
                    name: 'write-js',
                    activity: 'dist',
                    dist: 'binding: dist'
                }
            ]
        },
        {
            activity: Activities.if,
            externals: {
                data: 'ctx.getData() | dts'
            },
            condition: 'binding: dts',
            body: {
                name: 'write-dts',
                activity: 'dist',
                dist: 'binding: dts'
            }
        }
    ]
})
export class TsBuildActivity extends AssetActivity {
    @Input() dts: NodeExpression<string>;
    @Input() annotation: NodeExpression<boolean>;
    @Input('annotationFramework') annotationFramework: NodeExpression<ITransform>;
    @Input('beforePipes') beforePipes: ActivityType<ITransform>[];
    @Input('tsconfig', './tsconfig.json') tsconfig: NodeExpression<string | ObjectMap>;
    @Input() uglify: NodeExpression<boolean>;
    @Input('uglifyOptions') uglifyOptions: NodeExpression;
}

