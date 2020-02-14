import { isArray } from '@tsdi/ioc';
import { AfterInit, Binding, Input } from '@tsdi/components';
import { Task, Activities, ActivityTemplate } from '@tsdi/activities';
import { BuilderTypes } from './BuilderTypes';
import { AssetActivityOption, JsonEditActivityOption } from '../transforms';
import { Plugin } from 'rollup';
import { NodeActivityContext, NodeExpression } from '../NodeActivityContext';
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
                    condition: (ctx, scope: TsLibPackBuilder) => {
                        let input = ctx.input.input || scope.mainFile;
                        if (input) {
                            return isArray(input) ? input.some(i => tsFileExp.test(i)) : tsFileExp.test(input)
                        }
                        return false
                    },
                    body: <RollupTsOption>{
                        activity: 'rts',
                        input: (ctx, scope: TsLibPackBuilder) => ctx.input.input || scope.mainFile,
                        sourcemap: 'binding: sourcemap',
                        beforeCompilePlugins: 'binding: beforeCompile',
                        afterCompilePlugins: 'binding: plugins',
                        external: 'binding: external',
                        options: 'binding: options',
                        globals: 'binding: globals',
                        annotation: 'binding: annotation',
                        compileOptions: (ctx, scope: TsLibPackBuilder) => scope.getCompileOptions(ctx.input.target),
                        // uglify: ctx => ctx.input.uglify,
                        output: (ctx, scope: TsLibPackBuilder) => {
                            return {
                                format: ctx.input.format || 'cjs',
                                file: ctx.input.outputFile ? scope.toModulePath(ctx.input, ctx.input.outputFile) : undefined,
                                dir: ctx.input.outputFile ? undefined : scope.toModulePath(ctx.input),
                            }
                        }
                    }
                },
                {
                    activity: Activities.elseif,
                    condition: ctx => ctx.input.input,
                    body: <RollupOption>{
                        activity: 'rollup',
                        input: (ctx, scope: TsLibPackBuilder) => scope.toOutputPath(ctx.input.input),
                        sourcemap: 'binding: sourcemap',
                        plugins: 'binding: plugins',
                        external: 'binding: external',
                        options: 'binding: options',
                        globals: 'binding: globals',
                        output: (ctx, scope: TsLibPackBuilder) => {
                            let body = ctx.input;
                            return {
                                format: body.format || 'cjs',
                                file: body.outputFile ? scope.toModulePath(body, body.outputFile) : undefined,
                                dir: body.outputFile ? undefined : scope.toModulePath(body),
                            }
                        }
                    }
                },
                {
                    activity: Activities.if,
                    condition: ctx => ctx.input.uglify,
                    body: <AssetActivityOption>{
                        activity: 'asset',
                        src: (ctx, scope: TsLibPackBuilder) => isArray(ctx.input.input) ? scope.toModulePath(ctx.input, '/**/*.js') : scope.toModulePath(ctx.input, ctx.input.outputFile),
                        dist: (ctx, scope: TsLibPackBuilder) => scope.toModulePath(ctx.input),
                        sourcemap: 'binding: zipMapsource',
                        pipes: [
                            ctx => uglify(),
                            (ctx) => rename({ suffix: '.min' })
                        ]
                    }
                },

                {
                    activity: Activities.if,
                    condition: ctx => ctx.input.moduleName || ctx.input.target,
                    body: <AssetActivityOption>{
                        activity: 'asset',
                        src: (ctx, scope: TsLibPackBuilder) => scope.toOutputPath('package.json'),
                        dist: (ctx, scope: TsLibPackBuilder) => scope.outDir,
                        pipes: [
                            <JsonEditActivityOption>{
                                activity: 'jsonEdit',
                                json: (json, ctx, scope: TsLibPackBuilder) => {
                                    let input = ctx.input;                                 // to replace module export.
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
