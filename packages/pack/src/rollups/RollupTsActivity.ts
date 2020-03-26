import { isBoolean } from '@tsdi/ioc';
import { syncRequire } from '@tsdi/platform-server';
import { Binding, Input } from '@tsdi/components';
import { Task } from '@tsdi/activities';
import { Plugin, RollupOptions } from 'rollup';
import { CompilerOptions, nodeModuleNameResolver, sys } from 'typescript';
import { createFilter } from 'rollup-pluginutils';
import { NodeActivityContext } from '../NodeActivityContext';
import { RollupActivity, RollupOption } from './RollupActivity';
import { TsComplie } from '../ts-complie';
import { tsdexp } from '../exps';

/**
 * rollup activity template option.
 *
 * @export
 * @interface RollupOption
 * @extends {TemplateOption}
 */
export interface RollupTsOption extends RollupOption {
    /**
     * rollup annotation.
     *
     * @type {Binding<boolean>}
     * @memberof RollupOption
     */
    annotation?: Binding<boolean>;
    /**
     * include libs for auto create rollup options.
     *
     * @type {Binding<string[]>}
     * @memberof LibPackBuilderOption
     */
    includeLib?: Binding<string[]>;

    include?: Binding<string[]>;
    exclude?: Binding<string[]>;
    tsconfig?: Binding<string>;
    compileOptions?: Binding<CompilerOptions>;
    /**
     * dts sub folder name
     *
     * @type {string}
     * @memberof LibTaskOption
     */
    dts?: Binding<string>;
    /**
     * before compile plugins.
     *
     * @type {Binding<NodeExpression<Plugin[]>>}
     * @memberof RollupTsOption
     */
    beforeCompilePlugins?: Binding<Plugin[]>;
    /**
     * tscompile rollup plugin.
     *
     * @type {Binding<NodeExpression<Plugin>>}
     * @memberof RollupTsOption
     */
    tscompile?: Binding<Plugin>;
    uglify: Binding<boolean | Plugin>;
    /**
     * after ts compile rollup plugins.
     *
     * @type {Plugin[]}
     * @memberof RollupOption
     */
    afterCompilePlugins?: Binding<Plugin[]>;

}
const TSLIB_ID = '\0tslib';

@Task({
    selector: 'rts'
})
export class RollupTsActivity extends RollupActivity {

    @Input('beforeCompilePlugins') beforeCompile: Plugin[];
    @Input() tscompile: Plugin;
    @Input('afterCompilePlugins') afterCompile: Plugin[];

    @Input() includeLib: string[];
    @Input() annotation: boolean;

    @Input('include', ['*.ts+(|x)', '**/*.ts+(|x)']) include: string[];
    @Input('exclude', ['*.d.ts', '**/*.d.ts']) exclude: string[];

    @Input() dts: string;
    @Input('tsconfig', './tsconfig.json') tsconfig: string;
    @Input() compileOptions?: CompilerOptions;
    @Input() uglify: boolean | Plugin;

    private exeCache: {
        beforeCompile?: Plugin[];
        afterCompile?: Plugin[];
    }

    async execute(ctx: NodeActivityContext) {
        this.exeCache = {};
        await super.execute(ctx);
        delete this.exeCache;
    }

    protected getInputProps(): string[] {
        return [...super.getInputProps(), 'beforeCompile', 'afterCompile'];
    }

    protected vailfExternal(external: string[]): string[] {
        if (this.includeLib && this.includeLib.length) {
            return (external || []).filter(ex => this.includeLib.indexOf(ex) < 0);
        }
        return super.vailfExternal(external);
    }

    protected setOptions(ctx: NodeActivityContext, opts: RollupOptions, key: string, val: any) {
        if (key === 'beforeCompile') {
            this.exeCache.beforeCompile = val;
        } else if (key === 'afterCompile') {
            this.exeCache.afterCompile = val;
        } else {
            super.setOptions(ctx, opts, key, val);
        }
    }

    protected async resolvePlugins(ctx: NodeActivityContext, opts: RollupOptions) {
        let plugins: Plugin[] = [];
        let { beforeCompile, afterCompile } = this.exeCache;

        if (beforeCompile && beforeCompile.length) {
            plugins.push(...beforeCompile);
        }
        if (this.tscompile) {
            plugins.push(this.tscompile);
        } else {
            plugins.push(this.getDefaultTsCompiler(ctx));
        }

        if (opts.plugins && opts.plugins.length) {
            plugins.push(...opts.plugins);
        }

        if (afterCompile && afterCompile.length) {
            plugins.push(...afterCompile);
        }

        if (this.uglify) {
            let ugfy = this.uglify;
            const uglify = syncRequire('rollup-plugin-uglify');
            if (isBoolean(ugfy)) {
                ugfy && plugins.push(uglify());
            } else {
                plugins.push(ugfy);
            }
        }
        opts.plugins = plugins;
    }

    getDefaultTsCompiler(ctx: NodeActivityContext): Plugin {
        const tslib = syncRequire('tslib');

        let include = this.include;
        let exclude = this.exclude;
        let annotation = this.annotation;
        const filter = createFilter(include, exclude);
        let compile = ctx.injector.get(TsComplie);
        let projectDirectory = ctx.platform.getRootPath();
        let settings: CompilerOptions = this.compileOptions;
        let tsconfig = this.tsconfig;
        tsconfig = ctx.platform.toRootPath(tsconfig);

        let parsed = compile.parseTsconfig(projectDirectory, tsconfig, settings);
        const allImportedFiles = new Set();
        return {
            name: 'typescript',

            resolveId(importee, importer) {
                if (importee === 'tslib') {
                    return TSLIB_ID;
                }

                if (!importer) {
                    return null;
                }
                importer = ctx.platform.normalize(importer);
                if (!allImportedFiles.has(importer)) {
                    return;
                }

                const result = nodeModuleNameResolver(importee, importer, parsed.options, sys);

                if (result.resolvedModule && result.resolvedModule.resolvedFileName) {
                    if (tsdexp.test(result.resolvedModule.resolvedFileName || '')) {
                        return null;
                    }
                    return result.resolvedModule.resolvedFileName;
                }

                return null;
            },

            load(id) {
                if (id === TSLIB_ID) {
                    return tslib;
                }
            },

            transform(code, id) {
                if (!filter(id)) {
                    return undefined;
                }
                allImportedFiles.add(id.split('\\').join('/'));
                return compile.transpileModule(parsed.options, id, code, annotation);
            }
        };
    }

}
