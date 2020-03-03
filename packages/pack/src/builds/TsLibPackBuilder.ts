import { isArray } from '@tsdi/ioc';
import { AfterInit, Binding, Input } from '@tsdi/components';
import { Task, Activities, ActivityTemplate } from '@tsdi/activities';
import { BuilderTypes } from './BuilderTypes';
import { AssetActivityOption, JsonEditActivityOption } from '../transforms';
import { Plugin } from 'rollup';
import { NodeExpression } from '../NodeActivityContext';
import { LibPackBuilderOption, LibPackBuilder, LibBundleOption } from './LibPackBuilder';
import { RollupOption, RollupTsOption } from '../rollups';
import uglify from 'gulp-uglify-es';
import { tsFileExp } from '../exps';
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
                        let input = bind.getInput<LibBundleOption>().input || bind.getScope<TsLibPackBuilder>().mainFile;
                        if (input) {
                            return isArray(input) ? input.some(i => tsFileExp.test(i)) : tsFileExp.test(input)
                        }
                        return false
                    },
                    body: <RollupTsOption>{
                        activity: 'rts',
                        input: (ctx, bind) => bind.getInput<LibBundleOption>().input || bind.getScope<TsLibPackBuilder>().mainFile,
                        sourcemap: 'binding: sourcemap',
                        beforeCompilePlugins: 'binding: beforeCompile',
                        afterCompilePlugins: 'binding: plugins',
                        external: 'binding: external',
                        options: 'binding: options',
                        globals: 'binding: globals',
                        annotation: 'binding: annotation',
                        compileOptions: (ctx, bind) => bind.getScope<TsLibPackBuilder>().getCompileOptions(ctx.getInput<LibBundleOption>().target),
                        // uglify: ctx => ctx.input.uglify,
                        output: (ctx, bind) => {
                            let scope = bind.getScope<TsLibPackBuilder>();
                            let input = bind.getInput<LibBundleOption>();
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
                    condition: ctx => ctx.getInput<LibBundleOption>().input,
                    body: <RollupOption>{
                        activity: 'rollup',
                        input: (ctx, bind) => {
                            let inputs = bind.getInput<LibBundleOption>().input;
                            let scope = bind.getScope<LibPackBuilder>();
                            return isArray(inputs) ? inputs.map(i => scope.toOutputPath(i)) : scope.toOutputPath(inputs);
                        },
                        sourcemap: 'binding: sourcemap',
                        plugins: 'binding: plugins',
                        external: 'binding: external',
                        options: 'binding: options',
                        globals: 'binding: globals',
                        output: (ctx, bind) => {
                            let input = bind.getInput<LibBundleOption>();
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
                    condition: ctx => ctx.getInput<LibBundleOption>().uglify,
                    body: <AssetActivityOption>{
                        activity: 'asset',
                        src: (ctx, bind) => {
                            let input = bind.getInput<LibBundleOption>();
                            return isArray(input.input) ? bind.getScope<TsLibPackBuilder>().toModulePath(input, '/**/*.js') : bind.getScope<TsLibPackBuilder>().toModulePath(input, input.outputFile)
                        },
                        dist: (ctx, bind) => bind.getScope<TsLibPackBuilder>().toModulePath(bind.getInput()),
                        sourcemap: 'binding: sourcemap | path:"./"',
                        pipes: [
                            () => uglify(),
                            () => rename({ suffix: '.min' })
                        ]
                    }
                },

                {
                    activity: Activities.if,
                    condition: ctx => ctx.getInput<LibBundleOption>().moduleName || ctx.getInput<LibBundleOption>().target,
                    body: <AssetActivityOption>{
                        activity: 'asset',
                        src: (ctx, bind) => bind.getScope<TsLibPackBuilder>().toOutputPath('package.json'),
                        dist: (ctx, bind) => bind.getScope<TsLibPackBuilder>().outDir,
                        pipes: [
                            <JsonEditActivityOption>{
                                activity: 'jsonEdit',
                                json: (json, bind) => {
                                    let input = bind.getInput<LibBundleOption>();
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
