"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnotationCompileActivity = void 0;
const tslib_1 = require("tslib");
const ts = require("typescript");
const path = require("path");
const fs = require("fs");
const components_1 = require("@tsdi/components");
const activities_1 = require("@tsdi/activities");
const globby = require("globby");
let AnnotationCompileActivity = class AnnotationCompileActivity extends activities_1.Activity {
    constructor() {
        super(...arguments);
        this.src = 'src/**/*.ts';
        this.outDir = 'lib';
        this.options = {};
        this.exclude = ['node_modules', '**/*.spec.ts', '**/*.test.ts'];
    }
    async execute(context) {
        const startTime = Date.now();
        try {
            const patterns = [this.src, ...this.exclude.map(e => `!${e}`)];
            const filePaths = await globby(patterns, { cwd: process.cwd() });
            const results = [];
            for (const filePath of filePaths) {
                const result = await this.compileFile(filePath);
                results.push(result);
            }
            return {
                success: true,
                data: {
                    totalFiles: results.length,
                    classesProcessed: results.reduce((sum, r) => sum + r.classesProcessed, 0),
                    results,
                    duration: Date.now() - startTime
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
    async compileFile(filePath) {
        const sourceContent = fs.readFileSync(filePath, 'utf-8');
        const sourceFile = ts.createSourceFile(filePath, sourceContent, ts.ScriptTarget.Latest, true);
        const outputFile = path.join(this.outDir, path.relative(process.cwd(), filePath));
        const outputDir = path.dirname(outputFile);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const classesProcessed = this.processSourceFile(sourceFile);
        const transformedContent = this.transformSourceFile(sourceFile);
        fs.writeFileSync(outputFile, transformedContent, 'utf-8');
        return {
            file: filePath,
            outputFile,
            classesProcessed
        };
    }
    processSourceFile(sourceFile) {
        let count = 0;
        ts.forEachChild(sourceFile, (node) => {
            if (ts.isClassDeclaration(node) && node.name) {
                count++;
            }
        });
        return count;
    }
    transformSourceFile(sourceFile) {
        const printer = ts.createPrinter();
        return printer.printFile(sourceFile);
    }
};
exports.AnnotationCompileActivity = AnnotationCompileActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], AnnotationCompileActivity.prototype, "src", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], AnnotationCompileActivity.prototype, "outDir", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], AnnotationCompileActivity.prototype, "options", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], AnnotationCompileActivity.prototype, "exclude", void 0);
exports.AnnotationCompileActivity = AnnotationCompileActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'annotation-compile' })
], AnnotationCompileActivity);
//# sourceMappingURL=AnnotationCompileActivity.js.map