"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataGenerateActivity = void 0;
const tslib_1 = require("tslib");
const ts = require("typescript");
const path = require("path");
const fs = require("fs");
const components_1 = require("@tsdi/components");
const activities_1 = require("@tsdi/activities");
const globby = require("globby");
const MetadataGenerator_1 = require("./MetadataGenerator");
let MetadataGenerateActivity = class MetadataGenerateActivity extends activities_1.Activity {
    constructor() {
        super();
        this.src = 'src/**/*.ts';
        this.outDir = 'lib';
        this.options = {};
        this.exclude = ['node_modules', '**/*.spec.ts', '**/*.test.ts'];
        this.metadataCompiler = new MetadataGenerator_1.MetadataGenerator();
    }
    async execute(context) {
        try {
            const patterns = [this.src, ...this.exclude.map(e => `!${e}`)];
            const filePaths = await globby(patterns, { cwd: process.cwd() });
            const compilerOptions = {
                target: ts.ScriptTarget.ES2020,
                module: ts.ModuleKind.ES2020,
                experimentalDecorators: true,
                emitDecoratorMetadata: true,
                skipLibCheck: true
            };
            const allMetadata = {};
            const origins = {};
            for (const filePath of filePaths) {
                const moduleMetadata = this.metadataCompiler.compileModule(filePath, compilerOptions);
                const info = this.componentInfos?.get(filePath);
                if (info && moduleMetadata.metadata) {
                    for (const [className, classMeta] of Object.entries(moduleMetadata.metadata)) {
                        if (info.decoratorType === 'Component' || info.decoratorType === 'Directive') {
                            classMeta.decorators = classMeta.decorators || [];
                            if (info.decoratorType === 'Component') {
                                classMeta.decorators.push({ name: info.decoratorType, arguments: [{ selector: info.selector }] });
                                if (info.templateUrl) {
                                    classMeta.decorators.push({ name: 'templateUrl', arguments: [info.templateUrl] });
                                }
                                if (info.styleUrls?.length) {
                                    classMeta.decorators.push({ name: 'styleUrls', arguments: [info.styleUrls] });
                                }
                            }
                            else {
                                classMeta.decorators.push({ name: info.decoratorType, arguments: [{ selector: info.selector }] });
                            }
                        }
                        allMetadata[className] = classMeta;
                    }
                }
                if (moduleMetadata.metadata && Object.keys(moduleMetadata.metadata).length > 0) {
                    const relativePath = path.relative(process.cwd(), filePath);
                    const metadataPath = path.join(this.outDir, relativePath.replace(/\.ts$/, '.metadata.json'));
                    const metadataDir = path.dirname(metadataPath);
                    if (!fs.existsSync(metadataDir)) {
                        fs.mkdirSync(metadataDir, { recursive: true });
                    }
                    fs.writeFileSync(metadataPath, JSON.stringify(moduleMetadata, null, 2), 'utf-8');
                }
                if (moduleMetadata.metadata) {
                    Object.assign(allMetadata, moduleMetadata.metadata);
                }
                if (moduleMetadata.origins) {
                    Object.assign(origins, moduleMetadata.origins);
                }
            }
            if (this.options.flatModuleOutFile && Object.keys(allMetadata).length > 0) {
                await this.generateFlatModuleBundle(allMetadata, origins);
            }
            return {
                success: true,
                data: {
                    totalClasses: Object.keys(allMetadata).length,
                    metadata: allMetadata,
                    flatModuleGenerated: !!this.options.flatModuleOutFile
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error
            };
        }
    }
    async generateFlatModuleBundle(allMetadata, origins) {
        const flatModulePath = path.join(this.outDir, this.options.flatModuleOutFile);
        const flatModuleId = this.options.flatModuleId || path.basename(this.options.flatModuleOutFile, '.metadata.json');
        const flatMetadata = {};
        for (const [name, classMeta] of Object.entries(allMetadata)) {
            flatMetadata[name] = {
                ...classMeta,
                __symbolic: 'class',
                name
            };
        }
        const flatModule = {
            __symbolic: 'module',
            version: this.options.version || 4,
            metadata: flatMetadata,
            origins
        };
        const outDir = path.dirname(flatModulePath);
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }
        fs.writeFileSync(flatModulePath, JSON.stringify(flatModule, null, 2), 'utf-8');
    }
};
exports.MetadataGenerateActivity = MetadataGenerateActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], MetadataGenerateActivity.prototype, "src", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], MetadataGenerateActivity.prototype, "outDir", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], MetadataGenerateActivity.prototype, "options", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], MetadataGenerateActivity.prototype, "exclude", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Map)
], MetadataGenerateActivity.prototype, "componentInfos", void 0);
exports.MetadataGenerateActivity = MetadataGenerateActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'metadata-generate' }),
    tslib_1.__metadata("design:paramtypes", [])
], MetadataGenerateActivity);
//# sourceMappingURL=MetadataGenerateActivity.js.map