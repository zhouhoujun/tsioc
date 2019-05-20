import { Task, TemplateOption, Expression, Src, Activities } from '@tsdi/activities';
import { BuilderTypes } from './BuilderTypes';
import { TsBuildOption, AssetActivityOption, JsonEditActivityOption } from '../transforms';
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
import { isString, isNullOrUndefined, isBoolean, isArray, lang } from '@tsdi/ioc';
import { join } from 'path';
import { CleanActivityOption } from '../tasks';
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const grollup = require('gulp-rollup');
const postcss = require('rollup-plugin-postcss');
// const terser = require('rollup-plugin-terser');


export interface LibTaskOption {
    /**
     * module name output for package.
     *
     * @type {string}
     * @memberof LibTaskOption
     */
    moduleName?: string | string[];

    /**
     * output module folder name in outdir path. default use module name as folder name.
     *
     * @type {string}
     * @memberof LibTaskOption
     */
    moduleFolder?: string;
    /**
     * pipe stream src.
     *
     * @type {Src}
     * @memberof LibTaskOption
     */
    src?: Src;
    /**
     * dts sub folder name
     *
     * @type {string}
     * @memberof LibTaskOption
     */
    dts?: string,

    /**
     * for package typings
     *
     * @type {string}
     * @memberof LibTaskOption
     */
    dtsMain?: string;

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
     * the file name (with out dir path) rollup to write, or main file name.
     *
     * @type {string>}
     * @memberof LibTaskOption
     */
    fileName?: string;

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
    tasks: Binding<Expression<LibTaskOption[]>>;

    /**
     * project out dir.
     *
     * @type {Binding<string>}
     * @memberof LibPackBuilderOption
     */
    outDir: Binding<string>;

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

    /**
     * postcss option.
     *
     * @type {Binding<Expression<any>>}
     * @memberof LibPackBuilderOption
     */
    postcssOption?: Binding<Expression<any>>;
}

@Task({
    selector: BuilderTypes.libs,
    template: [
        <CleanActivityOption>{
            activity: 'clean',
            clean: ctx => ctx.scope.outDir
        },
        {
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
                        src: ctx => ctx.body.src,
                        uglify: ctx => ctx.body.uglify,
                        dist: ctx => ctx.scope.toModulePath(ctx.body),
                        dts: ctx => ctx.scope.toModulePath(ctx.body, ctx.body.dts),
                        annotation: ctx => ctx.body.annotation,
                        sourcemap: 'binding: sourcemap',
                        tsconfig: ctx => ctx.body.tsconfig
                    }
                },
                {
                    activity: Activities.if,
                    condition: (ctx: NodeActivityContext) => ctx.body.input && ctx.platform.getRootPath() === process.cwd(),
                    body: [
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
                                    file: ctx.body.fileName ? ctx.scope.toModulePath(ctx.body, ctx.body.fileName) : undefined,
                                    dir: ctx.body.fileName ? undefined : ctx.scope.toModulePath(ctx.body),
                                    globals: ctx.scope.globals
                                }
                            }
                        },
                        {
                            activity: Activities.if,
                            condition: ctx => ctx.body.uglify,
                            body: <AssetActivityOption>{
                                activity: 'asset',
                                src: ctx => isArray(ctx.body.input) ? ctx.scope.toModulePath(ctx.body, '/**/*.js') : ctx.scope.toModulePath(ctx.body, ctx.body.fileName),
                                dist: ctx => ctx.scope.toModulePath(ctx.body),
                                sourcemap: 'binding: zipMapsource',
                                pipes: [
                                    ctx => uglify(),
                                    (ctx) => rename({ suffix: '.min' })
                                ]
                            }
                        }
                    ]
                },
                {
                    activity: Activities.if,
                    condition: (ctx: NodeActivityContext) => ctx.body.input && ctx.platform.getRootPath() !== process.cwd(),
                    body: {
                        activity: 'asset',
                        src: ctx => {
                            if (ctx.body.src) {
                                return ctx.body.src;
                            }
                            if (isString(ctx.body.input)) {
                                return ctx.body.input.replace(ctx.platform.getFileName(ctx.body.input), '**/*');
                            } else if (isArray(ctx.body.input)) {
                                return ctx.body.input.maps((i: string) => i.replace(ctx.platform.getFileName(i), '**/*'));
                            }
                        },
                        dist: ctx => ctx.scope.getModuleFolder(ctx.body),
                        pipes: ctx => {
                            return [
                                grollup({
                                    name:  ctx.body.moduleName,
                                    format: ctx.body.format || 'cjs',
                                    plugins: ctx.scope.plugins,
                                    external: ctx.scope.external,
                                    globals: ctx.scope.globals
                                }),
                                uglify(),
                                rename({ suffix: '.min' })
                            ]
                        }
                    }
                },
                {
                    activity: Activities.if,
                    condition: ctx => ctx.body.moduleName,
                    body: [
                        {
                            activity: Activities.if,
                            condition: (ctx: NodeActivityContext) => !ctx.platform.existsFile(ctx.scope.toOutputPath('package.json')),
                            body: <AssetActivityOption>{
                                activity: 'asset',
                                src: ['package.json', '*.md'],
                                dist: ctx => ctx.scope.outDir
                            }
                        },
                        <AssetActivityOption>{
                            activity: 'asset',
                            src: ctx => ctx.scope.toOutputPath('package.json'),
                            dist: ctx => ctx.scope.outDir,
                            pipes: [
                                <JsonEditActivityOption>{
                                    activity: 'jsonEdit',
                                    json: (json, ctx) => {
                                        // to replace module export.
                                        let outmain = ['.', ctx.scope.getModuleFolder(ctx.body), ctx.body.fileName].join('/');
                                        if (isArray(ctx.body.moduleName)) {
                                            ctx.body.moduleName.forEach(n => {
                                                json[n] = outmain;
                                            })
                                        } else if (ctx.body.moduleName) {
                                            json[ctx.body.moduleName] = outmain;
                                        }
                                        if (ctx.body.dtsMain) {
                                            json['typings'] = ['.', ctx.scope.getModuleFolder(ctx.body), ctx.body.dtsMain].join('/');
                                        }
                                        return json;
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
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

    @Input()
    outDir: string;

    toOutputPath(...mdpath: string[]): string {
        return join(...[this.outDir, ...mdpath]);
    }

    toModulePath(body: any, ...paths: string[]): string {
        return join(...[
            this.outDir,
            this.getModuleFolder(body),
            ...paths]);
    }

    getModuleFolder(body: any): string {
        return body.moduleFolder || (isArray(body.moduleName) ? lang.first(body.moduleName) : body.moduleName)
    }

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

    @Input()
    postcssOption: Expression<any>;

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
            this.plugins = async (ctx: NodeActivityContext) => {
                let cssOptions = await ctx.resolveExpression(this.postcssOption);
                let sourcemap = await ctx.resolveExpression(this.sourcemap);
                return [
                    cssOptions ? postcss(ctx.resolveExpression(cssOptions)) : null,
                    resolve(),
                    commonjs(),
                    ctx.body.annotation ? rollupClassAnnotations() : null,
                    sourcemap ? rollupSourcemaps(isBoolean(sourcemap) ? undefined : sourcemap) : null,
                    ctx.body.tsconfig ? ts(isString(ctx.body.tsconfig) ? ctx.platform.getCompilerOptions(ctx.body.tsconfig) : ctx.body.tsconfig) : null
                ];
            };
        }
    }

}
