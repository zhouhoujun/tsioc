import { Task, Activities, ActivityTemplate } from '@tsdi/activities';
import { BuilderTypes } from './BuilderTypes';
import { TsBuildOption, AssetActivityOption, JsonEditActivityOption } from '../transforms';
import { Plugin } from 'rollup';
import { AfterInit, Binding, Input } from '@tsdi/components';
import { NodeActivityContext, NodeExpression } from '../core';
import { isArray } from '@tsdi/ioc';
import { LibPackBuilderOption, LibPackBuilder } from './LibPackBuilder';
import { RollupOption } from '../rollups';
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
                    condition: ctx => {
                        if (!ctx.body.target) {
                            return false;
                        }
                        if (ctx.body.moduleName) {
                            return isArray(ctx.body.moduleName) ? ctx.body.moduleName.some(i => /^esm/.test(i)) : /^esm/.test(ctx.body.moduleName);
                        }
                        return true;
                    },
                    body: <TsBuildOption>{
                        activity: 'ts',
                        src: 'binding: src',
                        dist: ctx => ctx.scope.getTargetPath(ctx.body),
                        dts: ctx => ctx.scope.dts ? ctx.scope.dts : (ctx.body.dtsMain ? './' : null),
                        annotation: 'binding: annotation',
                        sourcemap: 'binding: sourcemap',
                        tsconfig: ctx => ctx.scope.getCompileOptions(ctx.body.target)
                    }
                },
                {
                    activity: Activities.if,
                    condition: ctx => {
                        let input = ctx.body.input || ctx.scope.mainFile;
                        if (input) {
                            return isArray(input) ? input.some(i => /.ts$/.test(i)) : /.ts$/.test(input)
                        }
                        return false
                    },
                    body: {
                        activity: 'rts',
                        input: (ctx: NodeActivityContext) => ctx.platform.toRootSrc(ctx.body.input || ctx.scope.mainFile),
                        sourcemap: 'binding: sourcemap',
                        beforeCompilePlugins: 'binding: beforeCompile',
                        afterCompilePlugins: 'binding: plugins',
                        external: 'binding: external',
                        options: 'binding: options',
                        globals: 'binding: globals',
                        annotation: 'binding: annotation',
                        compileOptions: ctx => ctx.scope.getCompileOptions(ctx.body.target),
                        // uglify: ctx => ctx.body.uglify,
                        output: ctx => {
                            return {
                                format: ctx.body.format || 'cjs',
                                file: ctx.body.outputFile ? ctx.scope.toModulePath(ctx.body, ctx.body.outputFile) : undefined,
                                dir: ctx.body.outputFile ? undefined : ctx.scope.toModulePath(ctx.body),
                            }
                        }
                    }
                },
                {
                    activity: Activities.elseif,
                    condition: ctx => ctx.body.input,
                    body: <RollupOption>{
                        activity: 'rollup',
                        input: ctx => ctx.scope.toOutputPath(ctx.body.input),
                        sourcemap: 'binding: sourcemap',
                        plugins: 'binding: plugins',
                        external: 'binding: external',
                        options: 'binding: options',
                        globals: 'binding: globals',
                        output: ctx => {
                            return {
                                format: ctx.body.format || 'cjs',
                                file: ctx.body.outputFile ? ctx.scope.toModulePath(ctx.body, ctx.body.outputFile) : undefined,
                                dir: ctx.body.outputFile ? undefined : ctx.scope.toModulePath(ctx.body),
                            }
                        }
                    }
                },
                {
                    activity: Activities.if,
                    condition: ctx => ctx.body.uglify,
                    body: <AssetActivityOption>{
                        activity: 'asset',
                        src: ctx => isArray(ctx.body.input) ? ctx.scope.toModulePath(ctx.body, '/**/*.js') : ctx.scope.toModulePath(ctx.body, ctx.body.outputFile),
                        dist: ctx => ctx.scope.toModulePath(ctx.body),
                        sourcemap: 'binding: zipMapsource',
                        pipes: [
                            ctx => uglify(),
                            (ctx) => rename({ suffix: '.min' })
                        ]
                    }
                },

                {
                    activity: Activities.if,
                    condition: ctx => ctx.body.moduleName || ctx.body.target,
                    body: <AssetActivityOption>{
                        activity: 'asset',
                        src: ctx => ctx.scope.toOutputPath('package.json'),
                        dist: ctx => ctx.scope.outDir,
                        pipes: [
                            <JsonEditActivityOption>{
                                activity: 'jsonEdit',
                                json: (json, ctx) => {
                                    // to replace module export.
                                    if (ctx.body.target) {
                                        json[ctx.body.target] = ['.', ctx.scope.getTargetFolder(ctx.body), ctx.body.main || 'index.js'].join('/');
                                    }
                                    let outmain = ['.', ctx.scope.getModuleFolder(ctx.body), ctx.body.outputFile || 'index.js'].join('/');
                                    if (isArray(ctx.body.moduleName)) {
                                        ctx.body.moduleName.forEach(n => {
                                            json[n] = outmain;
                                        })
                                    } else if (ctx.body.moduleName) {
                                        json[ctx.body.moduleName] = outmain;
                                    }
                                    if (ctx.body.dtsMain) {
                                        json['typings'] = ['.', ctx.scope.getTargetFolder(ctx.body), ctx.body.dtsMain].join('/');
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
