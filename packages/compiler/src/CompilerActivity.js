"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompilerActivity = void 0;
const tslib_1 = require("tslib");
const components_1 = require("@tsdi/components");
const activities_1 = require("@tsdi/activities");
const TsConfigReader_1 = require("./TsConfigReader");
const CompilerTemplateExecutor_1 = require("./CompilerTemplateExecutor");
let CompilerActivity = class CompilerActivity extends activities_1.SequenceActivity {
    constructor() {
        super(...arguments);
        this.src = 'src/**/*.ts';
        this.outDir = 'lib';
        this.target = 'es2022';
        this.format = 'esm';
        this.platform = 'node';
        this.bundle = false;
        this.minify = false;
        this.sourcemap = true;
        this.declaration = true;
        this.generateMetadata = true;
        this.inlineStyles = false;
        this.inlineTemplate = false;
        this.exclude = ['node_modules', '**/*.spec.ts', '**/*.test.ts'];
        this.useTsconfig = true;
        this.files = [];
        this.componentInfos = new Map();
    }
    async execute(context) {
        if (this.template || this.useTsconfig) {
            return this.executeWithTemplate(context);
        }
        return this.executeDefault(context);
    }
    async executeWithTemplate(context) {
        const startTime = Date.now();
        const executor = new CompilerTemplateExecutor_1.CompilerTemplateExecutor(this.tsconfig);
        const runtime = {
            platform: this.platform,
            bundle: this.bundle,
            minify: this.minify,
            sourcemap: this.sourcemap,
            declaration: this.declaration,
            target: this.target,
            module: this.format
        };
        const template = this.template || this.createDefaultTemplate();
        const result = await executor.execute(template, runtime);
        return {
            success: result.success,
            data: {
                files: this.files,
                components: Array.from(this.componentInfos.values()),
                errors: [],
                warnings: [],
                outputFiles: [],
                duration: Date.now() - startTime,
                executedNodes: result.executedNodes,
                skippedNodes: result.skippedNodes,
                options: result.data?.options
            },
            error: result.error
        };
    }
    async executeDefault(context) {
        const startTime = Date.now();
        if (this.useTsconfig && !this.tsconfig) {
            const merged = this.loadTsConfigOptions();
            this.applyMergedOptions(merged);
        }
        return {
            success: true,
            data: {
                files: this.files,
                components: Array.from(this.componentInfos.values()),
                errors: [],
                warnings: [],
                outputFiles: [],
                duration: Date.now() - startTime
            }
        };
    }
    loadTsConfigOptions() {
        if (!this.tsConfigReader) {
            this.tsConfigReader = new TsConfigReader_1.TsConfigReader(this.tsconfig);
        }
        const runtime = {
            platform: this.platform,
            bundle: this.bundle,
            minify: this.minify,
            sourcemap: this.sourcemap,
            declaration: this.declaration
        };
        return this.tsConfigReader.mergeWithRuntime(runtime);
    }
    applyMergedOptions(merged) {
        this.src = merged.src;
        this.outDir = merged.outDir;
        this.target = merged.target;
        this.format = merged.format;
        this.platform = merged.platform;
        this.bundle = merged.bundle;
        this.minify = merged.minify;
        this.sourcemap = merged.sourcemap;
        this.declaration = merged.declaration;
        this.exclude = merged.exclude;
    }
    createDefaultTemplate() {
        const { createDefaultCompilerTemplate } = require('./CompilerTemplate');
        return createDefaultCompilerTemplate('Compiler Activity Template');
    }
    setTemplate(template) {
        this.template = template;
    }
    setTsConfigPath(path) {
        this.tsconfig = path;
        this.tsConfigReader = new TsConfigReader_1.TsConfigReader(path);
    }
    getMergedOptions() {
        return this.loadTsConfigOptions();
    }
};
exports.CompilerActivity = CompilerActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], CompilerActivity.prototype, "src", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], CompilerActivity.prototype, "outDir", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], CompilerActivity.prototype, "target", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], CompilerActivity.prototype, "format", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], CompilerActivity.prototype, "platform", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], CompilerActivity.prototype, "bundle", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], CompilerActivity.prototype, "minify", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], CompilerActivity.prototype, "sourcemap", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], CompilerActivity.prototype, "declaration", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], CompilerActivity.prototype, "generateMetadata", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], CompilerActivity.prototype, "flatModuleOutFile", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], CompilerActivity.prototype, "inlineStyles", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], CompilerActivity.prototype, "inlineTemplate", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], CompilerActivity.prototype, "exclude", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], CompilerActivity.prototype, "outputStyle", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", String)
], CompilerActivity.prototype, "tsconfig", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], CompilerActivity.prototype, "useTsconfig", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], CompilerActivity.prototype, "template", void 0);
exports.CompilerActivity = CompilerActivity = tslib_1.__decorate([
    (0, components_1.Component)({
        selector: 'compiler',
        template: `
        <sequence>
            <source-files [src]="src" (done)="onFiles($event)"></source-files>
            <component-parse [src]="src" (done)="onParsed($event)"></component-parse>
            <annotation-compile [src]="src" [outDir]="outDir"></annotation-compile>
            <esbuild-build [src]="src" [outDir]="outDir" [outputStyle]="outputStyle" [target]="target"></esbuild-build>
            <declaration-generate [src]="src" [outDir]="outDir"></declaration-generate>
        </sequence>
    `
    })
], CompilerActivity);
//# sourceMappingURL=CompilerActivity.js.map