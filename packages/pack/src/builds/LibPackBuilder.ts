import { isBoolean, isArray, lang, Inject, isString } from '@tsdi/ioc';
import { Input, AfterInit, Binding } from '@tsdi/components';
import { Task, TemplateOption, Src, Activities, ActivityTemplate, IActivityContext, Expression } from '@tsdi/activities';
import { TsBuildOption, AssetActivityOption, JsonEditActivityOption } from '../transforms';
import { CompilerOptions, ModuleKind } from 'typescript';
import { ExternalOption, RollupCache, WatcherOptions, GlobalsOption, Plugin, RollupOptions } from 'rollup';
import { RollupOption } from '../rollups';
import { PlatformService } from '../PlatformService';
import { join } from 'path';
import { NodeActivityContext } from '../NodeActivityContext';
import { CleanActivityOption } from '../tasks';
const through = require('through2');
const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify-es').default;

/**
 * target type.
 */
export type TargetType = 'es3' | 'es5' | 'es2015' | 'es2016' | 'es2017' | 'es2018' | 'es2019' | 'es2020' | 'es2021' | 'esnext' | 'json' | 'latest';

/**
 * module type.
 */
export type ModuleType = 'commonjs' | 'amd' | 'umd' | 'system' | 'es2015' | 'es2020' | 'es2022' | 'esnext' | 'node12' | 'nodenext';



/**
 * lib bundle option.
 */
export interface LibBundleOption {
    /**
     * typescript Compiler option target.
     *
     * @type {TargetType}
     * @memberof LibBundleOption
     */
    target?: TargetType;

    /**
     * typescript Compiler options module.
     */
    module?: ModuleType;

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
     * @type {Src}
     * @memberof LibTaskOption
     */
    input?: Src;
    /**
     * the file name (with out dir path) rollup to write, or main file name.
     *
     * @type {string}
     * @memberof LibTaskOption
     */
    outputFile?: string;

    /**
     * rollup format option.
     *
     * @type {string}
     * @memberof LibTaskOption
     */
    format?: string;

    /**
     * exports alis 'default' | 'node', as in package.json
     */
    exportAs?: 'default' | 'node';

}

export interface LibPackBuilderOption extends TemplateOption {
    /**
     * tasks
     *
     * @type { Binding<LibBundleOption[]>}
     * @memberof LibPackBuilderOption
     */
    bundles: Binding<LibBundleOption[]>;

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
     * @type {Binding<boolean>}
     * @memberof LibPackBuilderOption
     */
    annotation?: Binding<boolean>;

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
     * @type {Binding<boolean|string>}
     * @memberof RollupOption
     */
    sourcemap?: Binding<boolean | string>;

    test?: Binding<Src>;

    /**
     * rollup external setting.
     *
     * @type {NodeExpression<ExternalOption>}
     * @memberof RollupOption
     */
    external?: Binding<ExternalOption>;

    /**
     * custome config all rollup plugins.
     *
     * @type {NodeExpression<Plugin[]>}
     * @memberof RollupOption
     */
    plugins?: Binding<Plugin[]>;

    cache?: Binding<RollupCache>;

    watch?: Binding<WatcherOptions>;

    globals?: Binding<GlobalsOption>;
    /**
     * custom setup rollup options.
     *
     * @type {(RollupOptions)}
     * @memberof RollupOption
     */
    options?: Binding<RollupOptions>;

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
     * @type { Binding<Plugin[]>;}
     * @memberof LibPackBuilderOption
     */
    beforeResolve?: Binding<Plugin[]>;

    /**
     * replaces
     */
    replaces?: string[][];

    /**
     * build after clean.
     */
    clean?: Binding<Src>;

}

export function hasRollup(moduleName: Src) {
    if (!moduleName) return false;
    if (isString(moduleName)) {
        return moduleName.startsWith('f');
    }
    return moduleName.some(n => n.startsWith('f'));
}

@Task({
    selector: 'libs',
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
                        dist: (ctx, bind) => bind.getScope<LibPackBuilder>().getTargetPath(ctx.getInput()),
                        dts: (ctx, bind) => bind.getScope<LibPackBuilder>().getDtsPath(ctx.getInput()),
                        annotation: 'binding: annotation',
                        sourcemap: 'binding: sourcemap',
                        pipes: (ctx, bind) => {
                            const replaces = bind.getScope<LibPackBuilder>().replaces;
                            if (ctx.getInput<LibBundleOption>().format == 'es' && replaces && replaces.length) {
                                return [
                                    () => through.obj(function (file, encoding, callback) {
                                        if (file.isNull()) {
                                            return callback(null, file);
                                        }

                                        if (file.isStream()) {
                                            return callback('doesn\'t support Streams');
                                        }

                                        let contents: string = file.contents.toString('utf8');

                                        replaces.forEach(r => {
                                            contents = contents.replace(r[0], r[1]);
                                        });


                                        file.contents = new Buffer(contents, 'utf-8');
                                        this.push(file);
                                        callback();
                                    })
                                ];
                            }
                            return [];
                        },
                        tsconfig: (ctx, bind) => bind.getScope<LibPackBuilder>().transCompileOptions(ctx.getInput())
                    }
                },
                {
                    activity: Activities.if,
                    condition: ctx => ctx.getInput<LibBundleOption>()?.format === 'es',
                    body:[
                        <AssetActivityOption>{
                            activity: 'asset',
                            src: (ctx, bind) => bind.getScope<LibPackBuilder>().getTargetPath(ctx.getInput()) + '/**/*.js',
                            dist: (ctx, bind) => bind.getScope<LibPackBuilder>().getTargetPath(ctx.getInput()),
                            pipes: [
                                ()=> rename({extname: '.mjs'})
                            ]
                        },
                        <CleanActivityOption>{
                            activity: 'clean',
                            clean: (ctx, bind)=> bind.getScope<LibPackBuilder>().getTargetPath(ctx.getInput()) + '/**/*.js'
                        }
                        
                    ]
                },
                {
                    activity: Activities.if,
                    condition: ctx => ctx.getInput<LibBundleOption>().input || hasRollup(ctx.getInput<LibBundleOption>().moduleName),
                    body: [
                        <RollupOption>{
                            activity: 'rollup',
                            input: (ctx, bind) => bind.getScope<LibPackBuilder>().transRollupInput(ctx.getInput()),
                            sourcemap: 'binding: sourcemap',
                            plugins: (ctx, bind) => bind.getScope<LibPackBuilder>().transPlugins(ctx),
                            external: 'binding: external',
                            options: 'binding: options',
                            globals: 'binding: globals',
                            output: (ctx, bind) => bind.getScope<LibPackBuilder>().transRollupoutput(ctx.getInput())
                        },
                        {
                            activity: Activities.if,
                            condition: (ctx, bind) => bind.getInput<LibBundleOption>().uglify,
                            body: <AssetActivityOption>{
                                activity: 'asset',
                                src: (ctx, bind) => bind.getScope<LibPackBuilder>().getBundleSrc(ctx.getInput()),
                                dist: (ctx, bind) => bind.getScope<LibPackBuilder>().toModulePath(bind.getInput()),
                                sourcemap: 'binding: sourcemap | path:"./"',
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
                        dist: 'binding: outDir',
                        pipes: [
                            <JsonEditActivityOption>{
                                activity: 'jsonEdit',
                                json: (json, bind) => {
                                    let input = bind.getInput<LibBundleOption>();
                                    let scope = bind.getScope<LibPackBuilder>();

                                    if (!json.exports) {
                                        json.exports = {
                                            './package.json': {
                                                'default': './package.json'
                                            },
                                            '.': {}
                                        }
                                    }
                                    if (!json.exports['.']) {
                                        json.exports['.'] = {};
                                    }
                                    // to replace module export.

                                    const outmain = ['.', scope.getModuleFolder(input), input.outputFile || 'index.js'].join('/');
                                    const outidx = ['.', scope.getTargetFolder(input), input.main || 'index.js'].join('/');

                                    if (isArray(input.moduleName)) {
                                        input.moduleName.forEach(n => {
                                            if (n === 'main') {
                                                json[n] = outmain;
                                            } else if (n.startsWith('f')) {
                                                json.exports['.'][input.target] = json[input.target] = json[n] = outmain;
                                                if (input.exportAs) {
                                                    json.exports['.'][input.exportAs] = outmain;
                                                    if (input.exportAs === 'node') {
                                                        json['module'] = outmain
                                                    }
                                                }
                                            } else {
                                                json.exports['.'][n] = json[n] = outidx;
                                            }
                                        })
                                    } else if (input.moduleName) {
                                        const n = input.moduleName;
                                        if (n === 'main') {
                                            json[n] = outmain;
                                        } else if (n.startsWith('f')) {
                                            json.exports['.'][input.target] = json[n] = outmain;
                                            if (input.exportAs) {
                                                json.exports['.'][input.exportAs] = outmain;
                                                if (input.exportAs === 'node') {
                                                    json['module'] = outmain
                                                }
                                            }
                                        } else {
                                            json.exports['.'][n] = json[n] = outidx;
                                        }
                                    }
                                    if (input.dtsMain) {
                                        json.exports['.']['types'] = json['typings'] = ['.', scope.getTargetFolder(input), input.dtsMain].join('/');
                                    }
                                    return json;
                                }
                            }
                        ]
                    }
                }
            ]
        },
        {
            activity: 'clean',
            clean: 'binding: clean'
        }
    ]

    // template: `
    //     <clean [clean]="outDir"></clean>
    //     <test [test]="outDir"></test>
    //     <asset [src]="['package.json', '*.md']" [test]="outDir"></asset>
    //     <sequence *each="let input in bundles">
    //         <rts *if="vaidts(input)" [input]="transRollupInput(input)" [sourcemap]="sourcemap" [plugins]="transPlugins(ctx)" [external]="external"
    //                 [options]="options" [globals]="globals" [output]="transRollupoutput(input)"></rts>
    //         <rollup *elseif="input" [input]="transRollupInput(input)" [sourcemap]="sourcemap" [plugins]="transPlugins(ctx)" [external]="external"
    //                 [options]="options" [globals]="globals" [output]="transRollupoutput(input)"></rollup>
    //         <asset *if="input.uglify" [src]="getBundleSrc(input)" [dist]="toModulePath(input)" [sourcemap]="sourcemap | path:'./'" ></asset>
    //         <asset *if="input.moduleName || input.target" [src]="toOutputPath('package.json')" [dist]="outDir">
    //             <asset.pipes>
    //                 <jsonEdit [json]="json($event, input)"></jsonEdit>
    //             </asset.pipes>
    //         </asset>
    //     </sequence>
    // `
})
export class LibPackBuilder implements AfterInit {

    @Inject()
    protected platform: PlatformService;

    constructor() {

    }

    @Input() src: Src;
    @Input() clean: Src;
    @Input() test: Src;
    /**
     * tasks
     *
     * @type {(LibBundleOption[])}
     * @memberof LibPackBuilderOption
     */
    @Input() bundles: LibBundleOption[];
    @Input() outDir: string;
    @Input() annotation: boolean;
    @Input() dts: string;

    /**
     * rollup external setting.
     *
     * @type {ExternalOption}
     * @memberof RollupOption
     */
    @Input() external?: Expression<ExternalOption>;
    @Input() externalLibs: string[];
    @Input() includeLib: string[];
    /**
     * rollup plugins setting.
     *
     * @type {Plugin[]}
     * @memberof RollupOption
     */
    @Input() plugins: Plugin[];
    @Input() globals: GlobalsOption;
    @Input() cache?: RollupCache;
    @Input() watch?: WatcherOptions;


    @Input() replaces: string[][];
    /**
     * custom setup rollup options.
     *
     * @type {(NodeExpression<RollupOptions>)}
     * @memberof RollupOption
     */
    @Input() options?: RollupOptions;
    @Input({ defaultValue: true }) sourcemap?: boolean | string;

    @Input() beforeResolve: Plugin[];


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

    transRollupInput(input: LibBundleOption) {
        let inputs = input.input;
        if (!inputs) {
            inputs = input.target + '/index' + (input.format === 'es' ? '.mjs' : '.js')
        }
        return isArray(inputs) ? inputs.map(i => this.toOutputPath(i)) : this.toOutputPath(inputs);
    }

    transRollupoutput(input: LibBundleOption) {
        return {
            format: input.format || 'cjs',
            file: input.outputFile ? this.toModulePath(input, input.outputFile) : undefined,
            dir: input.outputFile ? undefined : this.toModulePath(input),
        }
    }

    transCompileOptions(input: LibBundleOption) {
        if (input.target) {
            const options = input.module ? { target: input.target, module: input.module } : { target: input.target };
            // if(input.format === 'es') {
            //     options['type'] = 'module'
            // }
            return options;
        }
        return {};
    }

    getDtsPath(input: LibBundleOption) {
        let targetpath = this.getTargetPath(input);
        return this.dts ? join(targetpath, this.dts) : (input.dtsMain ? targetpath : null)
    }


    transPlugins(ctx: IActivityContext) {
        let beforeResolve = this.beforeResolve || [];
        let sourcemap = this.sourcemap;
        let input = ctx.getInput<LibBundleOption>();
        return this.plugins ?
            [
                ...beforeResolve,
                ...this.plugins,
                sourcemap ? rollupSourcemaps(isBoolean(sourcemap) ? undefined : sourcemap) : null
            ]
            :
            [
                ...beforeResolve,
                resolve({ browser: input.format === 'umd' }),
                commonjs({ extensions: ['.js', '.ts', '.tsx'] }),
                sourcemap ? rollupSourcemaps(isBoolean(sourcemap) ? undefined : sourcemap) : null
            ];
    }

    getBundleSrc(input: LibBundleOption) {
        return isArray(input.input) ? this.toModulePath(input, '/**/*.js') : this.toModulePath(input, input.outputFile);
    }

    json(json, input) {
        // to replace module export.
        if (input.target) {
            json[input.target] = ['.', this.getTargetFolder(input), input.main || 'index.js'].join('/');
        }
        let outmain = ['.', this.getModuleFolder(input), input.outputFile || 'index.js'].join('/');
        if (isArray(input.moduleName)) {
            input.moduleName.forEach(n => {
                json[n] = outmain;
            })
        } else if (input.moduleName) {
            json[input.moduleName] = outmain;
        }
        if (input.dtsMain) {
            json['typings'] = ['.', this.getTargetFolder(input), input.dtsMain].join('/');
        }
        return json;
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
            this.external = (ctx: NodeActivityContext) => {
                return func(ctx);
            }
        }

    }

}
