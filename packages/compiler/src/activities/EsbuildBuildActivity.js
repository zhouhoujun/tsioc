"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EsbuildBuildActivity = void 0;
const tslib_1 = require("tslib");
const path = require("path");
const fs = require("fs");
const components_1 = require("@tsdi/components");
const activities_1 = require("@tsdi/activities");
const globby = require("globby");
const esbuild = require("esbuild");
let EsbuildBuildActivity = class EsbuildBuildActivity extends activities_1.Activity {
    constructor() {
        super(...arguments);
        this.src = 'src/**/*.ts';
        this.outDir = 'lib';
        this.bundle = false;
        this.minify = false;
        this.sourcemap = true;
        this.target = 'es2020';
        this.format = 'esm';
        this.platform = 'node';
        this.external = [];
        this.define = {};
        this.exclude = ['node_modules', '**/*.spec.ts', '**/*.test.ts'];
        this.options = {};
    }
    async execute(context) {
        const startTime = Date.now();
        try {
            if (this.outputStyle) {
                return await this.buildAngularStyle(startTime);
            }
            if (this.bundle && this.entryPoint) {
                const result = await this.bundleFiles();
                return {
                    success: result.success,
                    data: { ...result, duration: Date.now() - startTime },
                    error: result.success ? undefined : new Error(`${result.errors.length} build error(s)`)
                };
            }
            const files = await this.getSourceFiles();
            const results = [];
            for (const file of files) {
                const result = await this.compileFile(file);
                results.push(result);
            }
            const success = results.every(r => r.success);
            const allErrors = results.flatMap(r => r.errors);
            const allWarnings = results.flatMap(r => r.warnings);
            return {
                success,
                data: {
                    totalFiles: results.length,
                    successCount: results.filter(r => r.success).length,
                    errorCount: allErrors.length,
                    warningCount: allWarnings.length,
                    errors: allErrors,
                    warnings: allWarnings,
                    outputFiles: results.flatMap(r => r.outputFiles || []),
                    duration: Date.now() - startTime
                },
                error: !success ? new Error(`${allErrors.length} file(s) failed to compile`) : undefined
            };
        }
        catch (error) {
            return {
                success: false,
                error: error
            };
        }
    }
    async buildAngularStyle(startTime) {
        const style = this.outputStyle || 'esm2022';
        const isFesm = style.startsWith('fesm');
        const version = style.replace('fesm', 'esm').replace('esm', '');
        const outDir = path.join(this.outDir, style);
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }
        // Get package name for fesm output
        const packageName = await this.getPackageName();
        const buildOptions = {
            entryPoints: this.entryPoint ? [this.entryPoint] : [this.src],
            bundle: true,
            format: 'esm',
            platform: this.platform,
            target: `es${version}`,
            sourcemap: this.sourcemap,
            minify: isFesm ? (this.minify || true) : this.minify,
            splitting: false,
            external: this.external,
            define: {
                'process.env.NODE_ENV': '"development"',
                ...this.define
            },
            outdir: outDir,
            outExtension: { '.js': '.mjs' },
            metafile: true,
            write: true
        };
        // For fesm (flattened), output as package name.mjs
        if (isFesm) {
            buildOptions.outfile = path.join(outDir, `${packageName}.mjs`);
        }
        try {
            const result = await esbuild.build(buildOptions);
            const errors = result.errors.map((e) => ({
                file: e.location?.file || '',
                line: e.location?.line || 0,
                character: e.location?.column || 0,
                message: e.text,
                severity: 'error',
                code: 0
            }));
            const warnings = result.warnings.map((w) => ({
                file: w.location?.file || '',
                line: w.location?.line || 0,
                character: w.location?.column || 0,
                message: w.text,
                severity: 'warning',
                code: 0
            }));
            const outputFiles = [];
            if (result.outputFiles) {
                outputFiles.push(...result.outputFiles.map(f => f.path));
            }
            return {
                success: errors.length === 0,
                data: {
                    outputStyle: style,
                    outputDir: outDir,
                    outputFiles,
                    errors,
                    warnings,
                    metafile: result.metafile,
                    duration: Date.now() - startTime
                },
                error: errors.length > 0 ? new Error(`${errors.length} build error(s)`) : undefined
            };
        }
        catch (error) {
            return {
                success: false,
                error: error
            };
        }
    }
    async getSourceFiles() {
        const patterns = [this.src, ...this.exclude.map(e => `!${e}`)];
        const filePaths = await globby(patterns, { cwd: process.cwd() });
        return filePaths.map((filePath) => ({
            fileName: path.basename(filePath),
            filePath: path.resolve(filePath),
            content: fs.readFileSync(filePath, 'utf-8'),
            mtime: fs.statSync(filePath).mtime.getTime()
        }));
    }
    async compileFile(sourceFile) {
        const startTime = Date.now();
        const outFile = path.join(this.outDir, sourceFile.fileName.replace(/\.ts$/, '.js'));
        try {
            const result = await esbuild.build({
                entryPoints: [sourceFile.filePath],
                outfile: outFile,
                bundle: false,
                format: this.format,
                platform: this.platform,
                target: this.target,
                sourcemap: this.sourcemap,
                minify: this.minify,
                external: this.external,
                define: this.define,
                write: true
            });
            const errors = result.errors.map((e) => ({
                file: e.location?.file || sourceFile.filePath,
                line: e.location?.line || 0,
                character: e.location?.column || 0,
                message: e.text,
                severity: 'error',
                code: 0
            }));
            const warnings = result.warnings.map((w) => ({
                file: w.location?.file || sourceFile.filePath,
                line: w.location?.line || 0,
                character: w.location?.column || 0,
                message: w.text,
                severity: 'warning',
                code: 0
            }));
            return {
                success: errors.length === 0,
                errors,
                warnings,
                outputFiles: [outFile],
                duration: Date.now() - startTime
            };
        }
        catch (error) {
            return {
                success: false,
                errors: [{
                        file: sourceFile.filePath,
                        line: 0,
                        character: 0,
                        message: error.message,
                        severity: 'error',
                        code: 0
                    }],
                warnings: [],
                duration: Date.now() - startTime
            };
        }
    }
    async bundleFiles() {
        const startTime = Date.now();
        const outfile = this.outfile
            ? path.join(this.outDir, this.outfile)
            : path.join(this.outDir, 'bundle.js');
        try {
            const result = await esbuild.build({
                entryPoints: this.entryPoint ? [this.entryPoint] : undefined,
                outfile,
                bundle: true,
                format: this.format,
                platform: this.platform,
                target: this.target,
                sourcemap: this.sourcemap,
                minify: this.minify,
                external: this.external,
                define: this.define,
                metafile: true,
                write: true
            });
            const errors = result.errors.map((e) => ({
                file: e.location?.file || '',
                line: e.location?.line || 0,
                character: e.location?.column || 0,
                message: e.text,
                severity: 'error',
                code: 0
            }));
            const warnings = result.warnings.map((w) => ({
                file: w.location?.file || '',
                line: w.location?.line || 0,
                character: w.location?.column || 0,
                message: w.text,
                severity: 'warning',
                code: 0
            }));
            return {
                success: errors.length === 0,
                errors,
                warnings,
                outputFiles: [outfile],
                metafile: result.metafile,
                duration: Date.now() - startTime
            };
        }
        catch (error) {
            return {
                success: false,
                errors: [{
                        file: '',
                        line: 0,
                        character: 0,
                        message: error.message,
                        severity: 'error',
                        code: 0
                    }],
                warnings: [],
                duration: Date.now() - startTime
            };
        }
    }
    async getPackageName() {
        const pkgPath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            return pkg.name || 'index';
        }
        if (this.entryPoint) {
            return path.basename(this.entryPoint, path.extname(this.entryPoint));
        }
        return 'index';
    }
};
exports.EsbuildBuildActivity = EsbuildBuildActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], EsbuildBuildActivity.prototype, "src", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], EsbuildBuildActivity.prototype, "outDir", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], EsbuildBuildActivity.prototype, "entryPoint", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], EsbuildBuildActivity.prototype, "outfile", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], EsbuildBuildActivity.prototype, "bundle", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], EsbuildBuildActivity.prototype, "minify", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], EsbuildBuildActivity.prototype, "sourcemap", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], EsbuildBuildActivity.prototype, "target", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], EsbuildBuildActivity.prototype, "format", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], EsbuildBuildActivity.prototype, "platform", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], EsbuildBuildActivity.prototype, "external", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], EsbuildBuildActivity.prototype, "define", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], EsbuildBuildActivity.prototype, "exclude", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], EsbuildBuildActivity.prototype, "options", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], EsbuildBuildActivity.prototype, "outputStyle", void 0);
exports.EsbuildBuildActivity = EsbuildBuildActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'esbuild-build' })
], EsbuildBuildActivity);
//# sourceMappingURL=EsbuildBuildActivity.js.map