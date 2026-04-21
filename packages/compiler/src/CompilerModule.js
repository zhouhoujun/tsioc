"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompilerModule = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const components_1 = require("@tsdi/components");
const activities_1 = require("@tsdi/activities");
const CompilerActivity_1 = require("./CompilerActivity");
const activities_2 = require("./activities");
let CompilerModule = class CompilerModule {
};
exports.CompilerModule = CompilerModule;
exports.CompilerModule = CompilerModule = tslib_1.__decorate([
    (0, ioc_1.Module)({
        imports: [
            components_1.ComponentsModule,
            activities_1.WorkflowModule
        ],
        declarations: [
            CompilerActivity_1.CompilerActivity,
            activities_2.SourceFilesActivity,
            activities_2.EsbuildBuildActivity,
            activities_2.DeclarationGenerateActivity,
            activities_2.ComponentParseActivity,
            activities_2.MetadataGenerateActivity
        ],
        exports: [
            CompilerActivity_1.CompilerActivity,
            activities_2.SourceFilesActivity,
            activities_2.EsbuildBuildActivity,
            activities_2.DeclarationGenerateActivity,
            activities_2.ComponentParseActivity,
            activities_2.MetadataGenerateActivity
        ]
    })
], CompilerModule);
//# sourceMappingURL=CompilerModule.js.map