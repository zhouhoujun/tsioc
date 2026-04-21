"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeclarationGenerateActivity = void 0;
const tslib_1 = require("tslib");
const ts = require("typescript");
const path = require("path");
const components_1 = require("@tsdi/components");
const activities_1 = require("@tsdi/activities");
const globby = require("globby");
let DeclarationGenerateActivity = class DeclarationGenerateActivity extends activities_1.Activity {
    constructor() {
        super(...arguments);
        this.src = 'src/**/*.ts';
        this.outDir = 'lib';
        this.options = {};
        this.exclude = ['node_modules', '**/*.spec.ts', '**/*.test.ts'];
    }
    async execute(context) {
        try {
            const patterns = [this.src, ...this.exclude.map(e => `!${e}`)];
            const filePaths = await globby(patterns, { cwd: process.cwd() });
            const files = filePaths.map((filePath) => ({
                fileName: path.basename(filePath),
                filePath: path.resolve(filePath),
                content: '',
                mtime: 0
            }));
            const compilerOptions = {
                target: ts.ScriptTarget.ES2020,
                module: ts.ModuleKind.ES2020,
                declaration: this.options.declaration ?? true,
                emitDeclarationOnly: this.options.emitDeclarationOnly ?? true,
                outDir: this.outDir,
                declarationMap: this.options.declarationMap ?? true,
                skipLibCheck: true,
                esModuleInterop: true,
                experimentalDecorators: true,
                emitDecoratorMetadata: true,
                moduleResolution: ts.ModuleResolutionKind.NodeJs
            };
            const program = ts.createProgram(filePaths, compilerOptions);
            const emitResult = program.emit();
            const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
            const diagnosticInfos = diagnostics.map((diag) => {
                if (diag.file) {
                    const position = diag.file.getLineAndCharacterOfPosition(diag.start || 0);
                    return {
                        file: diag.file.fileName,
                        line: position.line + 1,
                        character: position.character + 1,
                        message: ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
                        severity: diag.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
                        code: diag.code
                    };
                }
                return {
                    file: '',
                    line: 0,
                    character: 0,
                    message: ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
                    severity: diag.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
                    code: diag.code
                };
            });
            const errors = diagnosticInfos.filter(d => d.severity === 'error');
            return {
                success: errors.length === 0,
                data: {
                    totalFiles: files.length,
                    diagnostics: diagnosticInfos,
                    errors,
                    warnings: diagnosticInfos.filter(d => d.severity === 'warning')
                },
                error: errors.length > 0 ? new Error(`${errors.length} declaration generation error(s)`) : undefined
            };
        }
        catch (error) {
            return {
                success: false,
                error: error
            };
        }
    }
};
exports.DeclarationGenerateActivity = DeclarationGenerateActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], DeclarationGenerateActivity.prototype, "src", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], DeclarationGenerateActivity.prototype, "outDir", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], DeclarationGenerateActivity.prototype, "options", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], DeclarationGenerateActivity.prototype, "exclude", void 0);
exports.DeclarationGenerateActivity = DeclarationGenerateActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'declaration-generate' })
], DeclarationGenerateActivity);
//# sourceMappingURL=DeclarationGenerateActivity.js.map