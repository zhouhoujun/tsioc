import { Task } from '@tsdi/activities';
import { isBoolean } from '@tsdi/ioc';
import { Binding, Input } from '@tsdi/components';
import { NodeExpression, NodeActivityContext } from '../core';
import { Plugin, RollupFileOptions, RollupDirOptions } from 'rollup';
import { rollupClassAnnotations } from '@tsdi/annotations';
import { CompilerOptions, nodeModuleNameResolver, transpileModule, flattenDiagnosticMessageText, DiagnosticCategory, ProjectReference, convertCompilerOptionsFromJson, readConfigFile, parseJsonConfigFileContent, Diagnostic } from 'typescript';
import * as ts from 'typescript';
import { createFilter } from 'rollup-pluginutils';
import { syncRequire } from '@tsdi/platform-server';
import * as path from 'path';
import * as fs from 'fs';
import * as resolve from 'resolve';
import uglify from 'rollup-plugin-uglify';
import { RollupActivity, RollupOption } from './RollupActivity';

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
    protected async execute(ctx: NodeActivityContext) {
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

    protected setOptions(ctx: NodeActivityContext, opts: RollupFileOptions | RollupDirOptions, key: string, val: any) {
        if (key === 'beforeCompile') {
            this.exeCache.beforeCompile = val;
        } else if (key === 'afterCompile') {
            this.exeCache.afterCompile = val;
        } else {
            super.setOptions(ctx, opts, key, val);
        }
    }

    protected async resolvePlugins(ctx: NodeActivityContext, opts: RollupFileOptions | RollupDirOptions) {
        let plugins: Plugin[] = [];
        let { beforeCompile, afterCompile } = this.exeCache;

        if (beforeCompile && beforeCompile.length) {
            plugins.push(...beforeCompile);
        }
        if (this.annotation) {
            let annotation = await this.resolveExpression(this.annotation, ctx);
            if (annotation) {
                plugins.push(rollupClassAnnotations());
            }
        }
        if (this.tscompile) {
            let compile = await this.resolveExpression(this.tscompile, ctx);
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
            let ugfy = await this.resolveExpression(this.uglify, ctx);
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

        let include = await this.resolveExpression(this.include, ctx);
        let exclude = await this.resolveExpression(this.exclude, ctx)
        const filter = createFilter(include, exclude);
        const tsdexp = /.d.ts$/;
        let compilerOptions = await this.createProject(ctx);
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
                importer = importer.split('\\').join('/');
                if (!allImportedFiles.has(importer)) {
                    return;
                }

                const result = nodeModuleNameResolver(importee, importer, compilerOptions, ts.sys);

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

                const transformed = transpileModule(code, {
                    fileName: id,
                    reportDiagnostics: true,
                    compilerOptions
                });

                // All errors except `Cannot compile modules into 'es6' when targeting 'ES5' or lower.`
                const diagnostics: Diagnostic[] = transformed.diagnostics ?
                    transformed.diagnostics.filter(diagnostic => diagnostic.code !== 1204) : [];

                let fatalError = false;

                diagnostics.forEach(diagnostic => {
                    const message = flattenDiagnosticMessageText(diagnostic.messageText, '\n');

                    if (diagnostic.file) {
                        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

                        console.error(`${diagnostic.file.fileName}(${line + 1},${character + 1}): error TS${diagnostic.code}: ${message}`);
                    } else {
                        console.error(`Error: ${message}`);
                    }

                    if (diagnostic.category === DiagnosticCategory.Error) {
                        fatalError = true;
                    }
                });

                if (fatalError) {
                    throw new Error(`There were TypeScript errors transpiling`);
                }

                return {
                    code: transformed.outputText,
                    // Rollup expects `map` to be an object so we must parse the string
                    map: transformed.sourceMapText ? JSON.parse(transformed.sourceMapText) : null
                };
            }
        };
    }

    protected async createProject(ctx: NodeActivityContext): Promise<CompilerOptions> {
        let projectDirectory = ctx.platform.getRootPath();
        let compilerOptions: CompilerOptions;
        // let projectReferences: ReadonlyArray<ProjectReference>;
        let settings: CompilerOptions = await this.resolveExpression(this.compileOptions, ctx);
        let fileName = await this.resolveExpression(this.tsconfig, ctx);
        fileName = ctx.platform.toRootPath(fileName);

        const settingsResult = convertCompilerOptionsFromJson(settings || {}, projectDirectory);

        // if (settingsResult.errors) {
        //     throw settingsResult.errors;
        // }
        compilerOptions = settingsResult.options;

        let tsConfig = readConfigFile(fileName, ts.sys.readFile);
        if (tsConfig.error) {
            console.log(tsConfig.error.messageText);
        }

        let parsed: ts.ParsedCommandLine =
            parseJsonConfigFileContent(
                tsConfig.config || {},
                this.getTsconfigSystem(ts),
                path.resolve(projectDirectory),
                compilerOptions,
                fileName);

        // if (parsed.errors) {
        //     throw parsed.errors;
        // }

        compilerOptions = parsed.options;
        // projectReferences = parsed.projectReferences;
        return compilerOptions;
    }

    protected getTsconfigSystem(typescript: typeof ts): ts.ParseConfigHost {
        return {
            useCaseSensitiveFileNames: typescript.sys.useCaseSensitiveFileNames,
            readDirectory: () => [],
            fileExists: typescript.sys.fileExists,
            readFile: typescript.sys.readFile
        };
    }

}
