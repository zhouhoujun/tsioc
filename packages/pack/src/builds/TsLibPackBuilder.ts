import { isArray } from '@tsdi/ioc';
import { AfterInit, Binding, Input } from '@tsdi/components';
import { Task, Activities, ActivityTemplate } from '@tsdi/activities';
import { BuilderTypes } from './BuilderTypes';
import { AssetActivityOption, JsonEditActivityOption } from '../transforms';
import { Plugin } from 'rollup';
import { NodeExpression } from '../NodeActivityContext';
import { LibPackBuilderOption, LibPackBuilder } from './LibPackBuilder';
import { RollupOption, RollupTsOption } from '../rollups';
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');


export interface TsLibPackBuilderOption extends LibPackBuilderOption {

    mainFile?: Binding<string>;
    /**
     * before ts compile.
     *
     * @type {Binding<NodeExpression<Plugin[]>>}
     * @memberof TsLibPackBuilderOption
     */
    beforeCompile?: Binding<NodeExpression<Plugin[]>>;
}

const esmChkExp = /^esm/;
const tsFileExp = /.ts$/;

/**
 * build ts project by rollup
 *
 * @export
 * @class TsLibPackBuilder
 * @extends {LibPackBuilder}
 * @implements {AfterInit}
 */
@Task({
    selector: BuilderTypes.tslibs,
    template: <ActivityTemplate>[
        {
            activity: 'clean',
            clean: 'binding: outDir'
        },
        {
            activity: 'test',
            test: 'binding: test',
        },
        {
            activity: 'asset',
            src: ['package.json', '*.md'],
            dist: 'binding: outDir'
        },
        {
            activity: 'each',
            each: 'binding: bundles',
            body: [
                {
                    activity: Activities.if,
                    condition: (ctx, bind) => {
                        let input = bind.input.input || bind.getScope<TsLibPackBuilder>().mainFile;
                        if (input) {
                            return isArray(input) ? input.some(i => tsFileExp.test(i)) : tsFileExp.test(input)
                        }
                        return false
                    },
                    body: <RollupTsOption>{
                        activity: 'rts',
                        input: (ctx, bind) => bind.input.input || bind.getScope<TsLibPackBuilder>().mainFile,
                        sourcemap: 'binding: sourcemap',
                        beforeCompilePlugins: 'binding: beforeCompile',
                        afterCompilePlugins: 'binding: plugins',
                        external: 'binding: external',
                        options: 'binding: options',
                        globals: 'binding: globals',
                        annotation: 'binding: annotation',
                        compileOptions: (ctx, bind) => bind.getScope<TsLibPackBuilder>().getCompileOptions(ctx.input.target),
                        // uglify: ctx => ctx.input.uglify,
                        output: (ctx, bind) => {
                            let scope = bind.getScope<TsLibPackBuilder>();
                            let input = bind.input;
                            return {
                                format: input.format || 'cjs',
                                file: input.outputFile ? scope.toModulePath(input, input.outputFile) : undefined,
                                dir: input.outputFile ? undefined : scope.toModulePath(input),
                            }
                        }
                    }
                },
                {
                    activity: Activities.elseif,
                    condition: ctx => ctx.input.input,
                    body: <RollupOption>{
                        activity: 'rollup',
                        input: (ctx, bind) => bind.getScope<TsLibPackBuilder>().toOutputPath(bind.input.input),
                        sourcemap: 'binding: sourcemap',
                        plugins: 'binding: plugins',
                        external: 'binding: external',
                        options: 'binding: options',
                        globals: 'binding: globals',
                        output: (ctx, bind) => {
                            let input = bind.input;
                            let scope = bind.getScope<TsLibPackBuilder>();
                            return {
                                format: input.format || 'cjs',
                                file: input.outputFile ? scope.toModulePath(input, input.outputFile) : undefined,
                                dir: input.outputFile ? undefined : scope.toModulePath(input),
                            }
                        }
                    }
                },
                {
                    activity: Activities.if,
                    condition: ctx => ctx.input.uglify,
                    body: <AssetActivityOption>{
                        activity: 'asset',
                        src: (ctx, bind) => isArray(bind.input.input) ? bind.getScope<TsLibPackBuilder>().toModulePath(bind.input, '/**/*.js') : bind.getScope<TsLibPackBuilder>().toModulePath(bind.input, bind.input.outputFile),
                        dist: (ctx, bind) => bind.getScope<TsLibPackBuilder>().toModulePath(bind.input),
                        sourcemap: 'binding: zipMapsource',
                        pipes: [
                            () => uglify(),
                            () => rename({ suffix: '.min' })
                        ]
                    }
                },

                {
                    activity: Activities.if,
                    condition: ctx => ctx.input.moduleName || ctx.input.target,
                    body: <AssetActivityOption>{
                        activity: 'asset',
                        src: (ctx, bind) => bind.getScope<TsLibPackBuilder>().toOutputPath('package.json'),
                        dist: (ctx, bind) => bind.getScope<TsLibPackBuilder>().outDir,
                        pipes: [
                            <JsonEditActivityOption>{
                                activity: 'jsonEdit',
                                json: (json, bind) => {
                                    let input = bind.input;
                                    let scope = bind.getScope<TsLibPackBuilder>();
                                    // to replace module export.
                                    if (input.target) {
                                        json[input.target] = ['.', scope.getTargetFolder(input), input.main || 'index.js'].join('/');
                                    }
                                    let outmain = ['.', scope.getModuleFolder(input), input.outputFile || 'index.js'].join('/');
                                    if (isArray(input.moduleName)) {
                                        input.moduleName.forEach(n => {
                                            json[n] = outmain;
                                        })
                                    } else if (input.moduleName) {
                                        json[input.moduleName] = outmain;
                                    }
                                    if (input.dtsMain) {
                                        json['typings'] = ['.', scope.getTargetFolder(input), input.dtsMain].join('/');
                                    }
                                    return json;
                                }
                            }
                        ]
                    }
                }
            ]
        }
    ]
})
export class TsLibPackBuilder extends LibPackBuilder implements AfterInit {

    @Input() mainFile: string;
    @Input() beforeCompile: NodeExpression<Plugin[]>;
}
