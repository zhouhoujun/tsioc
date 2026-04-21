"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceFilesActivity = void 0;
const tslib_1 = require("tslib");
const path = require("path");
const fs = require("fs");
const components_1 = require("@tsdi/components");
const activities_1 = require("@tsdi/activities");
const globby = require("globby");
let SourceFilesActivity = class SourceFilesActivity extends activities_1.Activity {
    constructor() {
        super(...arguments);
        this.src = 'src/**/*.ts';
        this.exclude = ['node_modules', '**/*.spec.ts', '**/*.test.ts'];
    }
    async execute(context) {
        const patterns = [this.src, ...this.exclude.map(e => `!${e}`)];
        const filePaths = await globby(patterns, { cwd: process.cwd() });
        const files = filePaths.map((filePath) => ({
            fileName: path.basename(filePath),
            filePath: path.resolve(filePath),
            content: fs.readFileSync(filePath, 'utf-8'),
            mtime: fs.statSync(filePath).mtime.getTime()
        }));
        return {
            success: true,
            data: { files, count: files.length }
        };
    }
};
exports.SourceFilesActivity = SourceFilesActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], SourceFilesActivity.prototype, "src", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], SourceFilesActivity.prototype, "exclude", void 0);
exports.SourceFilesActivity = SourceFilesActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'source-files' })
], SourceFilesActivity);
//# sourceMappingURL=SourceFilesActivity.js.map