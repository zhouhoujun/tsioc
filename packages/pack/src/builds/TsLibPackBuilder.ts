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
                // {
                //     activity: Activities.if,
                //     condition: ctx => {
                //         let body = ctx.input;
                //         if (!body.target) {
                //             return false;
                //         }
                //         if (body.moduleName) {
                //             return isArray(body.moduleName) ? body.moduleName.some(i => esmChkExp.test(i)) : esmChkExp.test(body.moduleName);
                //         }
                //         return true;
                //     },
                //     body: <TsBuildOption>{
                //         activity: 'ts',
                //         src: 'binding: src',
                //         dist: ctx => ctx.scope.getTargetPath(ctx.input),
                //         dts: ctx => ctx.scope.dts ? ctx.scope.dts : (ctx.input.dtsMain ? './' : null),
                //         annotation: 'binding: annotation',
                //         sourcemap: 'binding: sourcemap',
                //         tsconfig: ctx => ctx.scope.getCompileOptions(ctx.input.target)
                //     }
                // },
                {
                    activity: Activities.if,
                    condition: ctx => {
                        let input = ctx.input.input || ctx.scope.mainFile;
                        if (input) {
                            return isArray(input) ? input.some(i => tsFileExp.test(i)) : tsFileExp.test(input)
                        }
                        return false
                    },
                    body: <RollupTsOption>{
                        activity: 'rts',
                        input: (ctx: NodeActivityContext) => ctx.input.input || ctx.scope.mainFile,
                        sourcemap: 'binding: sourcemap',
                        beforeCompilePlugins: 'binding: beforeCompile',
                        afterCompilePlugins: 'binding: plugins',
                        external: 'binding: external',
                        options: 'binding: options',
                        globals: 'binding: globals',
                        annotation: 'binding: annotation',
                        compileOptions: ctx => ctx.scope.getCompileOptions(ctx.input.target),
                        // uglify: ctx => ctx.input.uglify,
                        output: ctx => {
                            return {
                                format: ctx.input.format || 'cjs',
                                file: ctx.input.outputFile ? ctx.scope.toModulePath(ctx.input, ctx.input.outputFile) : undefined,
                                dir: ctx.input.outputFile ? undefined : ctx.scope.toModulePath(ctx.input),
                            }
                        }
                    }
                },
                {
                    activity: Activities.elseif,
                    condition: ctx => ctx.input.input,
                    body: <RollupOption>{
                        activity: 'rollup',
                        input: ctx => ctx.scope.toOutputPath(ctx.input.input),
                        sourcemap: 'binding: sourcemap',
                        plugins: 'binding: plugins',
                        external: 'binding: external',
                        options: 'binding: options',
                        globals: 'binding: globals',
                        output: ctx => {
                            let body = ctx.input;
                            return {
                                format: body.format || 'cjs',
                                file: body.outputFile ? ctx.scope.toModulePath(body, body.outputFile) : undefined,
                                dir: body.outputFile ? undefined : ctx.scope.toModulePath(body),
                            }
                        }
                    }
                },
                {
                    activity: Activities.if,
                    condition: ctx => ctx.input.uglify,
                    body: <AssetActivityOption>{
                        activity: 'asset',
                        src: ctx => isArray(ctx.input.input) ? ctx.scope.toModulePath(ctx.input, '/**/*.js') : ctx.scope.toModulePath(ctx.input, ctx.input.outputFile),
                        dist: ctx => ctx.scope.toModulePath(ctx.input),
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
                        src: ctx => ctx.$parent.component.toOutputPath('package.json'),
                        dist: ctx => ctx.scope.outDir,
                        pipes: [
                            <JsonEditActivityOption>{
                                activity: 'jsonEdit',
                                json: (json, ctx) => {
                                    let body = ctx.input;                                 // to replace module export.
                                    if (body.target) {
                                        json[body.target] = ['.', ctx.$parent.component.getTargetFolder(body), body.main || 'index.js'].join('/');
                                    }
                                    let outmain = ['.', ctx.$parent.component.getModuleFolder(body), body.outputFile || 'index.js'].join('/');
                                    if (isArray(body.moduleName)) {
                                        body.moduleName.forEach(n => {
                                            json[n] = outmain;
                                        })
                                    } else if (body.moduleName) {
                                        json[body.moduleName] = outmain;
                                    }
                                    if (body.dtsMain) {
                                        json['typings'] = ['.', ctx.$parent.component.getTargetFolder(body), body.dtsMain].join('/');
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
