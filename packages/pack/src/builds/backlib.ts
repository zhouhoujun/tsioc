import { Task, TemplateOption, Expression, Src, Activities } from '@tsdi/activities';
import { BuilderTypes } from './BuilderTypes';
import { TsBuildOption, AssetActivityOption } from '../transforms';
import { CompilerOptions } from 'typescript';
import { ExternalOption, RollupCache, WatcherOptions, RollupFileOptions, RollupDirOptions, GlobalsOption } from 'rollup';
import { RollupOption } from '../rollups';
import { Input, AfterInit, Binding } from '@tsdi/boot';
import { PlatformService, NodeActivityContext } from '../core';
const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
const ts = require('rollup-plugin-typescript');
import { rollupClassAnnotations } from '@tsdi/annotations';
import { isString, isNullOrUndefined, isBoolean, isArray } from '@tsdi/ioc';
import { dirname, basename, join } from 'path';
import { CleanActivityOption } from '../tasks';
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const inplace = require('json-in-place');

export interface LibTaskOption {
    /**
     * package export module name.
     *
     * @type {string}
     * @memberof LibTaskOption
     */
    moduleName?: string;
    /**
     * pipe stream src.
     *
     * @type {Src}
     * @memberof LibTaskOption
     */
    src?: Src;

    /**
     * output dir path. 
     *
     * @type {string}
     * @memberof LibTaskOption
     */
    dist: string;

    dts?: string,
    annotation?: boolean;
    uglify?: boolean;
    tsconfig?: string | CompilerOptions;

    /**
     * rollup input.
     *
     * @type {Src>>}
     * @memberof LibTaskOption
     */
    input?: Src;
    /**
     * the file name (with out dir path) rollup to write
     *
     * @type {string>}
     * @memberof LibTaskOption
     */
    outputFile?: string;

    /**
     * rollup format option.
     *
     * @type {string>}
     * @memberof LibTaskOption
     */
    format?: string;
}

export interface LibPackBuilderOption extends TemplateOption {
    /**
     * tasks
     *
     * @type { Binding<LibTaskOption[]>}
     * @memberof LibPackBuilderOption
     */
    tasks?: Binding<Expression<LibTaskOption[]>>;
    /**
     * rollup external setting.
     *
     * @type {Expression<ExternalOption>}
     * @memberof RollupOption
     */
    external?: Binding<Expression<ExternalOption>>;

    /**
     * enable source maps or not.
     *
     * @type {Binding<Expression<boolean|string>>}
     * @memberof RollupOption
     */
    sourcemap?: Binding<Expression<boolean | string>>;

    /**
     * rollup plugins setting.
     *
     * @type {Expression<Plugin[]>}
     * @memberof RollupOption
     */
    plugins?: Binding<Expression<Plugin[]>>;

    cache?: Binding<Expression<RollupCache>>;

    watch?: Binding<Expression<WatcherOptions>>;

    globals?: Binding<Expression<GlobalsOption>>;
    /**
     * custom setup rollup options.
     *
     * @type {(Expression<RollupFileOptions | RollupDirOptions>)}
     * @memberof RollupOption
     */
    options?: Binding<Expression<RollupFileOptions | RollupDirOptions>>;
}

@Task({
    selector: BuilderTypes.libs,
    template: {
        activity: 'each',
        each: 'binding: tasks',
        body: [
            {
                activity: Activities.if,
                condition: ctx => ctx.body.test,
                body: {
                    activity: 'test',
                    test: ctx => ctx.body.test
                }
            },
            {
                activity: 'if',
                condition: ctx => ctx.body.src,
                body: <TsBuildOption>{
                    activity: 'ts',
                    clean: ctx => ctx.body.dist,
                    src: ctx => ctx.body.src,
                    // test: ctx => ctx.body.test,
                    uglify: ctx => ctx.body.uglify,
                    dist: ctx => ctx.body.dist,
                    dts: ctx => ctx.body.dts || ctx.body.dist,
                    annotation: ctx => ctx.body.annotation,
                    sourcemap: 'binding: sourcemap',
                    tsconfig: ctx => ctx.body.tsconfig
                }
            },
            {
                activity: Activities.if,
                condition: ctx => ctx.body.input,
                body: [
                    <CleanActivityOption>{
                        activity: 'clean',
                        clean: ctx => ctx.body.dist
                    },
                    <RollupOption>{
                        activity: 'rollup',
                        input: ctx => ctx.body.input,
                        sourcemap: 'binding: sourcemap',
                        plugins: 'binding: plugins',
                        external: 'binding: external',
                        options: 'binding: options',
                        output: ctx => {
                            return {
                                format: ctx.body.format || 'cjs',
                                file: ctx.body.outputFile ? join(ctx.body.dist, ctx.body.outputFile) : undefined,
                                dir: ctx.body.outputFile ? undefined : ctx.body.outputDir,
                                globals: ctx.scope.globals
                            }
                        }
                    },
                    {
                        activity: Activities.if,
                        condition: ctx => ctx.body.uglify,
                        body: <AssetActivityOption>{
                            activity: 'asset',
                            src: ctx => isArray(ctx.body.input) ? join(ctx.body.dist, '/**/*.js') : join(ctx.body.dist, ctx.body.outputFile),
                            dist: ctx => ctx.body.dist,
                            sourcemap: 'binding: zipMapsource',
                            pipes: [
                                ctx => uglify(),
                                (ctx) => rename(ctx.body.outputFile.replace(/\.js$/, '.min.js'))
                            ]
                        }
                    }
                ]
            },
            {
                activity: Activities.if,
                condition: ctx => ctx.body.moduleName,
                body: [
                    {
                        activity: Activities.if,
                        condition: (ctx: NodeActivityContext) => !ctx.platform.existsFile(join(ctx.body.dist, 'package.json')),
                        body: {
                            activity: Activities.execute,
                            action: (ctx: NodeActivityContext) => ctx.platform.copyFile(join(ctx.body.dist, 'package.json'), ctx.body.dist)
                        }
                    }
                    // to replace module export.

                ]
            }
        ]
    }
})
export class LibPackBuilder implements AfterInit {

    constructor(private platform: PlatformService) {

    }

    /**
     * tasks
     *
     * @type {(LibTaskOption[])}
     * @memberof LibPackBuilderOption
     */
    @Input()
    tasks: Expression<LibTaskOption[]>;
    /**
     * rollup external setting.
     *
     * @type {Expression<ExternalOption>}
     * @memberof RollupOption
     */
    @Input()
    external?: Expression<ExternalOption>;

    /**
     * rollup plugins setting.
     *
     * @type {Expression<Plugin[]>}
     * @memberof RollupOption
     */
    @Input()
    plugins: Expression<Plugin[]>;

    @Input()
    globals: Expression<GlobalsOption>;

    @Input()
    cache?: Expression<RollupCache>;

    @Input()
    watch?: Expression<WatcherOptions>;
    /**
     * custom setup rollup options.
     *
     * @type {(Expression<RollupFileOptions | RollupDirOptions>)}
     * @memberof RollupOption
     */
    @Input()
    options?: Expression<RollupFileOptions | RollupDirOptions>;

    @Input()
    sourcemap?: Expression<boolean | string>;

    get zipMapsource() {
        if (this.sourcemap && isBoolean(this.sourcemap)) {
            return './';
        }
        return this.sourcemap;
    }

    async onAfterInit(): Promise<void> {
        if (!this.external) {
            this.external = [
                'process', 'util', 'path', 'fs', 'events', 'stream', 'child_process', 'os',
                ...Object.keys(this.platform.getPackage().dependencies || {})];
            if (this.external.indexOf('rxjs')) {
                this.external.push('rxjs/operators')
            }
            this.globals = this.globals || {};
            this.external.forEach(k => {
                if (!this.globals[k]) {
                    this.globals[k] = k;
                }
            });
        }
        if (isNullOrUndefined(this.sourcemap)) {
            this.sourcemap = true;
        }
        if (!this.plugins) {
            this.plugins = (ctx: NodeActivityContext) => [
                resolve(),
                commonjs(),
                ctx.body.annotation ? rollupClassAnnotations() : null,
                rollupSourcemaps(),
                ctx.body.tsconfig ? ts(isString(ctx.body.tsconfig) ? ctx.platform.getCompilerOptions(ctx.body.tsconfig) : ctx.body.tsconfig) : null
            ];
        }
    }

}
