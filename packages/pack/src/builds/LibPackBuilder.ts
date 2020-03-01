import { isNullOrUndefined, isBoolean, isArray, lang } from '@tsdi/ioc';
import { Input, AfterInit, Binding } from '@tsdi/components';
import { Task, TemplateOption, Src, Activities, ActivityTemplate } from '@tsdi/activities';
import { BuilderTypes } from './BuilderTypes';
import { TsBuildOption, AssetActivityOption, JsonEditActivityOption } from '../transforms';
import { CompilerOptions } from 'typescript';
import { ExternalOption, RollupCache, WatcherOptions, GlobalsOption, Plugin, RollupOptions } from 'rollup';
import { RollupOption } from '../rollups';
// import { rollupClassAnnotations } from '@tsdi/annotations';
import { join } from 'path';
import { NodeExpression, NodeActivityContext } from '../NodeActivityContext';
import uglify from 'gulp-uglify-es';
const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
// const buildin = require('rollup-plugin-node-builtins');
// const ts = require('rollup-plugin-typescript');

const rename = require('gulp-rename');
// const grollup = require('gulp-rollup');
// const postcss = require('rollup-plugin-postcss');
// const terser = require('rollup-plugin-terser');


export interface LibBundleOption {
    /**
     * typescript build target.
     *
     * @type {string}
     * @memberof LibBundleOption
     */
    target?: string;

    targetFolder?: string;

    /**
     * default `index.js`
     *
     * @type {string}
     * @memberof LibBundleOption
     */
    main?: string;
    /**
     * for package typings
     *
     * @type {string}
     * @memberof LibTaskOption
     */
    dtsMain?: string
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
     * @type { Binding<LibBundleOption[]>}
     * @memberof LibPackBuilderOption
     */
    bundles: Binding<NodeExpression<LibBundleOption[]>>;

    /**
     * project source.
     *
     * @type {Binding<string>}
     * @memberof LibPackBuilderOption
     */
    src: Binding<Src>;

    /**
     * project out dir.
     *
     * @type {Binding<string>}
     * @memberof LibPackBuilderOption
     */
    outDir: Binding<string>;

    /**
     * annotation source file.
     *
     * @type {Binding<NodeExpression<boolean>>}
     * @memberof LibPackBuilderOption
     */
    annotation?: Binding<NodeExpression<boolean>>;

    /**
     * dts sub folder name
     *
     * @type {string}
     * @memberof LibTaskOption
     */
    dts?: Binding<string>,

    /**
     * enable source maps or not.
     *
     * @type {Binding<NodeExpression<boolean|string>>}
     * @memberof RollupOption
     */
    sourcemap?: Binding<NodeExpression<boolean | string>>;

    test?: Binding<Src>;

    /**
     * rollup external setting.
     *
     * @type {NodeExpression<ExternalOption>}
     * @memberof RollupOption
     */
    external?: Binding<NodeExpression<ExternalOption>>;

    /**
     * custome config all rollup plugins.
     *
     * @type {NodeExpression<Plugin[]>}
     * @memberof RollupOption
     */
    plugins?: Binding<NodeExpression<Plugin[]>>;

    cache?: Binding<NodeExpression<RollupCache>>;

    watch?: Binding<NodeExpression<WatcherOptions>>;

    globals?: Binding<NodeExpression<GlobalsOption>>;
    /**
     * custom setup rollup options.
     *
     * @type {(NodeExpression<RollupOptions>)}
     * @memberof RollupOption
     */
    options?: Binding<NodeExpression<RollupOptions>>;

    /**
     * postcss option.
     *
     * @type {Binding<NodeExpression>}
     * @memberof LibPackBuilderOption
     */
    postcssOption?: Binding<NodeExpression>;

    /**
     * external Libs for auto create rollup options.
     *
     * @type {string[]}
     * @memberof LibBundleOption
     */
    externalLibs?: Binding<string[]>;

    /**
     * include libs for auto create rollup options.
     *
     * @type {Binding<string[]>}
     * @memberof LibPackBuilderOption
     */
    includeLib?: Binding<string[]>;

    /**
     * use this plugins before auto generate plugins.
     *
     * resolveId
     * ` (source: string, importer: string) => string | false | null | {id: string, external?: boolean, moduleSideEffects?: boolean | null}`
     *
     * @type { Binding<NodeExpression<Plugin[]>>;}
     * @memberof LibPackBuilderOption
     */
    beforeResolve?: Binding<NodeExpression<Plugin[]>>;

}

@Task({
    selector: BuilderTypes.libs,
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
                    condition: ctx => ctx.getInput<LibBundleOption>().target,
                    body: <TsBuildOption>{
                        activity: 'ts',
                        src: 'binding: src',
                        dist: (ctx, bind) => bind.getScope<LibPackBuilder>().getTargetPath(bind.getInput()),
                        dts: (ctx, bind) => {
                            let input = bind.getInput<LibBundleOption>();
                            let scope = bind.getScope<LibPackBuilder>();
                            let targetpath = scope.getTargetPath(input);
                            return scope.dts ? join(targetpath, scope.dts) : (input.dtsMain ? targetpath : null)
                        },
                        annotation: 'binding: annotation',
                        sourcemap: 'binding: sourcemap',
                        tsconfig: (ctx, bind) => bind.getScope<LibPackBuilder>().getCompileOptions(bind.getInput<LibBundleOption>().target)
                    }
                },
                {
                    activity: Activities.if,
                    condition: ctx => ctx.getInput<LibBundleOption>().input,
                    body: [
                        <RollupOption>{
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
                                let scope = bind.getScope<LibPackBuilder>();
                                let input = bind.getInput<LibBundleOption>();
                                return {
                                    format: input.format || 'cjs',
                                    file: input.outputFile ? scope.toModulePath(input, input.outputFile) : undefined,
                                    dir: input.outputFile ? undefined : scope.toModulePath(input),
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
                                    return isArray(input.input) ? bind.getScope<LibPackBuilder>().toModulePath(input, '/**/*.js') : bind.getScope<LibPackBuilder>().toModulePath(input, input.outputFile)
                                },
                                dist: (ctx, bind) => bind.getScope<LibPackBuilder>().toModulePath(bind.getInput()),
                                sourcemap: 'binding: zipMapsource',
                                pipes: [
                                    () => uglify(),
                                    () => rename({ suffix: '.min' })
                                ]
                            }
                        }
                    ]
                },
                {
                    activity: Activities.if,
                    condition: ctx => ctx.getInput<LibBundleOption>().moduleName || ctx.getInput<LibBundleOption>().target,
                    body: <AssetActivityOption>{
                        activity: 'asset',
                        src: (ctx, bind) => bind.getScope<LibPackBuilder>().toOutputPath('package.json'),
                        dist: (ctx, bind) => bind.getScope<LibPackBuilder>().outDir,
                        pipes: [
                            <JsonEditActivityOption>{
                                activity: 'jsonEdit',
                                json: (json, bind) => {
                                    let input = bind.getInput<LibBundleOption>();
                                    let scope = bind.getScope<LibPackBuilder>();
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
export class LibPackBuilder implements AfterInit {

    constructor() {

    }

    @Input() src: Src;
    @Input() test: Src;
    /**
     * tasks
     *
     * @type {(LibBundleOption[])}
     * @memberof LibPackBuilderOption
     */
    @Input() bundles: NodeExpression<LibBundleOption[]>;
    @Input() outDir: string;
    @Input() annotation: NodeExpression<boolean>;
    @Input() dts: string;

    /**
     * rollup external setting.
     *
     * @type {NodeExpression<ExternalOption>}
     * @memberof RollupOption
     */
    @Input() external?: NodeExpression<ExternalOption>;
    @Input() externalLibs: string[];
    @Input() includeLib: string[];
    /**
     * rollup plugins setting.
     *
     * @type {NodeExpression<Plugin[]>}
     * @memberof RollupOption
     */
    @Input() plugins: NodeExpression<Plugin[]>;
    @Input() globals: NodeExpression<GlobalsOption>;
    @Input() cache?: NodeExpression<RollupCache>;
    @Input() watch?: NodeExpression<WatcherOptions>;
    /**
     * custom setup rollup options.
     *
     * @type {(NodeExpression<RollupOptions>)}
     * @memberof RollupOption
     */
    @Input() options?: NodeExpression<RollupOptions>;
    @Input() sourcemap?: NodeExpression<boolean | string>;
    @Input() postcssOption: NodeExpression;

    @Input() beforeResolve: NodeExpression<Plugin[]>

    get zipMapsource() {
        if (this.sourcemap && isBoolean(this.sourcemap)) {
            return './';
        }
        return this.sourcemap;
    }

    getCompileOptions(target: string) {
        if (target) {
            return { target: target };
        }
        return {};
    }


    toOutputPath(...mdpath: string[]): string {
        return join(...[this.outDir, ...mdpath.filter(f => f)]);
    }

    toModulePath(input: LibBundleOption, ...paths: string[]): string {
        return join(...[
            this.outDir,
            this.getModuleFolder(input),
            ...paths.filter(f => f)]);
    }

    getTargetPath(input: LibBundleOption) {
        return this.toOutputPath(this.getTargetFolder(input));
    }

    getTargetFolder(input: LibBundleOption): string {
        return input.targetFolder || input.target;
    }

    getModuleFolder(input: LibBundleOption): string {
        return input.moduleFolder || (isArray(input.moduleName) ? lang.first(input.moduleName) : input.moduleName)
    }

    async onAfterInit(): Promise<void> {
        if (!this.external) {
            let func = (ctx: NodeActivityContext) => {
                let packagejson = ctx.platform.getPackage();
                let external = [
                    'process', 'util', 'path', 'fs', 'events', 'stream', 'child_process', 'os',
                    'https', 'http', 'url', 'crypto',
                    ...(this.externalLibs || []),
                    ...Object.keys(packagejson.dependencies || {}),
                    ...Object.keys(packagejson.peerDependencies || {})];
                if (external.indexOf('rxjs')) {
                    external.push('rxjs/operators')
                }
                if (this.includeLib && this.includeLib.length) {
                    external = external.filter(ex => this.includeLib.indexOf(ex) < 0);
                }
                return external;
            };
            this.external = (ctx) => {
                return func(ctx);
            }
        }

        if (isNullOrUndefined(this.sourcemap)) {
            this.sourcemap = true;
        }
        if (!this.plugins) {
            this.plugins = async (ctx: NodeActivityContext, bind) => {
                let beforeResolve = await bind.resolveExpression(this.beforeResolve);
                let sourcemap = await bind.resolveExpression(this.sourcemap);
                let input = bind.getInput<LibBundleOption>();
                return [
                    ...(beforeResolve || []),
                    resolve({ browser: input.format === 'umd' }),
                    commonjs({ extensions: ['.js', '.ts', '.tsx'] }),
                    sourcemap ? rollupSourcemaps(isBoolean(sourcemap) ? undefined : sourcemap) : null
                ];
            };
        }
    }

}
