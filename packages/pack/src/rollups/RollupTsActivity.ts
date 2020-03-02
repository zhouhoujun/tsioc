import { isBoolean } from '@tsdi/ioc';
import { syncRequire } from '@tsdi/platform-server';
import { Binding, Input } from '@tsdi/components';
import { Task } from '@tsdi/activities';
import { Plugin, RollupOptions } from 'rollup';
import { CompilerOptions, nodeModuleNameResolver, sys } from 'typescript';
import { createFilter } from 'rollup-pluginutils';
import { NodeExpression, NodeActivityContext } from '../NodeActivityContext';
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
     * @type {Binding<NodeExpression<boolean>>}
     * @memberof RollupOption
     */
    annotation?: Binding<NodeExpression<boolean>>;
    /**
     * include libs for auto create rollup options.
     *
     * @type {Binding<string[]>}
     * @memberof LibPackBuilderOption
     */
    includeLib?: Binding<string[]>;

    include?: Binding<NodeExpression<string[]>>;
    exclude?: Binding<NodeExpression<string[]>>;
    tsconfig?: Binding<NodeExpression<string>>;
    compileOptions?: Binding<NodeExpression<CompilerOptions>>;
    /**
     * dts sub folder name
     *
     * @type {string}
     * @memberof LibTaskOption
     */
    dts?: Binding<NodeExpression<string>>;
    /**
     * before compile plugins.
     *
     * @type {Binding<NodeExpression<Plugin[]>>}
     * @memberof RollupTsOption
     */
    beforeCompilePlugins?: Binding<NodeExpression<Plugin[]>>;
    /**
     * tscompile rollup plugin.
     *
     * @type {Binding<NodeExpression<Plugin>>}
     * @memberof RollupTsOption
     */
    tscompile?: Binding<NodeExpression<Plugin>>;
    uglify: Binding<NodeExpression<boolean | Plugin>>;
    /**
     * after ts compile rollup plugins.
     *
     * @type {NodeExpression<Plugin[]>}
     * @memberof RollupOption
     */
    afterCompilePlugins?: Binding<NodeExpression<Plugin[]>>;

}
const TSLIB_ID = '\0tslib';

@Task({
    selector: 'rts'
})
export class RollupTsActivity extends RollupActivity {

    @Input('beforeCompilePlugins') beforeCompile: NodeExpression<Plugin[]>;
    @Input() tscompile: NodeExpression<Plugin>;
    @Input('afterCompilePlugins') afterCompile: NodeExpression<Plugin[]>;

    @Input() includeLib: string[];
    @Input() annotation: NodeExpression<boolean>;

    @Input('include', ['*.ts+(|x)', '**/*.ts+(|x)']) include: NodeExpression<string[]>;
    @Input('exclude', ['*.d.ts', '**/*.d.ts']) exclude: NodeExpression<string[]>;

    @Input() dts: NodeExpression<string>;
    @Input('tsconfig', './tsconfig.json') tsconfig: NodeExpression<string>;
    @Input() compileOptions?: NodeExpression<CompilerOptions>;
    @Input() uglify: NodeExpression<boolean | Plugin>;

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
            let compile = await ctx.resolveExpression(this.tscompile);
            plugins.push(compile);
        } else {
            plugins.push(await this.getDefaultTsCompiler(ctx));
        }

        if (opts.plugins && opts.plugins.length) {
            plugins.push(...opts.plugins);
        }

        if (afterCompile && afterCompile.length) {
            plugins.push(...afterCompile);
        }

        if (this.uglify) {
            let ugfy = await ctx.resolveExpression(this.uglify);
            const uglify = syncRequire('rollup-plugin-uglify');
            if (isBoolean(ugfy)) {
                ugfy && plugins.push(uglify());
            } else {
                plugins.push(ugfy);
            }
        }
        opts.plugins = plugins;
    }

    async getDefaultTsCompiler(ctx: NodeActivityContext): Promise<Plugin> {
        const tslib = syncRequire('tslib');

        let include = await ctx.resolveExpression(this.include);
        let exclude = await ctx.resolveExpression(this.exclude)
        let annotation = await ctx.resolveExpression(this.annotation);
        const filter = createFilter(include, exclude);
        let compile = ctx.injector.get(TsComplie);
        let projectDirectory = ctx.platform.getRootPath();
        let settings: CompilerOptions = await ctx.resolveExpression(this.compileOptions);
        let tsconfig = await ctx.resolveExpression(this.tsconfig);
        tsconfig = ctx.platform.toRootPath(tsconfig);

        let compilerOptions = compile.createProject(projectDirectory, tsconfig, settings);
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

                const result = nodeModuleNameResolver(importee, importer, compilerOptions, sys);

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
                return compile.compile(id, compilerOptions, code, annotation);
            }
        };
    }

}
