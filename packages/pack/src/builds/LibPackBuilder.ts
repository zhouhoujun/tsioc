import { isBoolean, isArray, lang, Inject } from '@tsdi/ioc';
import { Input, AfterInit, Binding } from '@tsdi/components';
import { Task, TemplateOption, Src, Activities, ActivityTemplate, IActivityContext } from '@tsdi/activities';
import { BuilderTypes } from './BuilderTypes';
import { TsBuildOption, AssetActivityOption, JsonEditActivityOption } from '../transforms';
import { CompilerOptions } from 'typescript';
import { ExternalOption, RollupCache, WatcherOptions, GlobalsOption, Plugin, RollupOptions } from 'rollup';
import { RollupOption } from '../rollups';
import { PlatformService } from '../PlatformService';
import { join } from 'path';
const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify-es');

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

}

@Task({
    selector: BuilderTypes.libs,
    template: `
        <clean [clean]="outDir"></clean>
        <test [test]="outDir"></test>
        <asset [src]="['package.json', '*.md']" [test]="outDir"></asset>
        <sequence *each="let input in bundles">
            <rts *if="vaidts(input)" [input]="transRollupInput(input)" [sourcemap]="sourcemap" [plugins]="transPlugins(ctx)" [external]="external"
                    [options]="options" [globals]="globals" [output]="transRollupoutput(input)"></rts>
            <rollup *elseif="input" [input]="transRollupInput(input)" [sourcemap]="sourcemap" [plugins]="transPlugins(ctx)" [external]="external"
                    [options]="options" [globals]="globals" [output]="transRollupoutput(input)"></rollup>
            <asset *if="input.uglify" [src]="getBundleSrc(input)" [dist]="toModulePath(input)" [sourcemap]="sourcemap | path:'./'" ></asset>
            <asset *if="input.moduleName || input.target" [src]="toOutputPath('package.json')" [dist]="outDir">
                <asset.pipes>
                    <jsonEdit [json]="json($event, input)"></jsonEdit>
                </asset.pipes>
            </asset>
        </sequence>
    `
})
export class LibPackBuilder implements AfterInit {

    @Inject()
    protected platform: PlatformService;

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
    @Input() external?: ExternalOption;
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
            return { target: input.target };
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
            let packagejson = this.platform.getPackage();
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
            this.external = this.external;
        }

        // if (!this.plugins) {
        //     this.plugins = async (ctx: NodeActivityContext, bind) => {
        //         let beforeResolve = this.beforeResolve;
        //         let sourcemap = this.sourcemap;
        //         let input = bind.getInput<LibBundleOption>();
        //         return [
        //             ...(beforeResolve || []),
        //             resolve({ browser: input.format === 'umd' }),
        //             commonjs({ extensions: ['.js', '.ts', '.tsx'] }),
        //             sourcemap ? rollupSourcemaps(isBoolean(sourcemap) ? undefined : sourcemap) : null
        //         ];
        //     };
        // }
    }

}


// template: <ActivityTemplate>[
//     {
//         activity: 'clean',
//         clean: 'binding: outDir'
//     },
//     {
//         activity: 'test',
//         test: 'binding: test',
//     },
//     {
//         activity: 'asset',
//         src: ['package.json', '*.md'],
//         dist: 'binding: outDir'
//     },
//     {
//         activity: 'each',
//         each: 'binding: bundles',
//         body: [
//             {
//                 activity: Activities.if,
//                 condition: ctx => ctx.getInput<LibBundleOption>().target,
//                 body: <TsBuildOption>{
//                     activity: 'ts',
//                     src: 'binding: src',
//                     dist: 'binding: getTargetPath(ctx.getInput())',
//                     dts: 'binding: getDtsPath(ctx.getInput())',
//                     annotation: 'binding: annotation',
//                     sourcemap: 'binding: sourcemap',
//                     tsconfig: 'binding: transCompileOptions(ctx.getInput())'
//                 }
//             },
//             {
//                 activity: Activities.if,
//                 condition: ctx => ctx.getInput<LibBundleOption>().input,
//                 body: [
//                     <RollupOption>{
//                         activity: 'rollup',
//                         input: 'binding: transRollupInput(ctx.getInput())',
//                         sourcemap: 'binding: sourcemap',
//                         plugins: 'binding: transPlugins(ctx)',
//                         external: 'binding: external',
//                         options: 'binding: options',
//                         globals: 'binding: globals',
//                         output: 'binding: transRollupoutput(ctx.getInput())'
//                     },
//                     {
//                         activity: Activities.if,
//                         condition: (ctx, bind) => bind.getInput<LibBundleOption>().uglify,
//                         body: <AssetActivityOption>{
//                             activity: 'asset',
//                             src: 'binding: getBundleSrc(ctx.getInput())',
//                             dist: 'binding: toModulePath(bind.getInput())',
//                             sourcemap: 'binding: sourcemap | path:"./"',
//                             pipes: [
//                                 () => uglify(),
//                                 () => rename({ suffix: '.min' })
//                             ]
//                         }
//                     }
//                 ]
//             },
//             {
//                 activity: Activities.if,
//                 condition: ctx => ctx.getInput<LibBundleOption>().moduleName || ctx.getInput<LibBundleOption>().target,
//                 body: <AssetActivityOption>{
//                     activity: 'asset',
//                     src: 'binding: toOutputPath("package.json")',
//                     dist: 'binding: outDir',
//                     pipes: [
//                         <JsonEditActivityOption>{
//                             activity: 'jsonEdit',
//                             json: (json, bind) => {
//                                 let input = bind.getInput<LibBundleOption>();
//                                 let scope = bind.getScope<LibPackBuilder>();
//                                 // to replace module export.
//                                 if (input.target) {
//                                     json[input.target] = ['.', scope.getTargetFolder(input), input.main || 'index.js'].join('/');
//                                 }
//                                 let outmain = ['.', scope.getModuleFolder(input), input.outputFile || 'index.js'].join('/');
//                                 if (isArray(input.moduleName)) {
//                                     input.moduleName.forEach(n => {
//                                         json[n] = outmain;
//                                     })
//                                 } else if (input.moduleName) {
//                                     json[input.moduleName] = outmain;
//                                 }
//                                 if (input.dtsMain) {
//                                     json['typings'] = ['.', scope.getTargetFolder(input), input.dtsMain].join('/');
//                                 }
//                                 return json;
//                             }
//                         }
//                     ]
//                 }
//             }
//         ]
//     }
// ]
