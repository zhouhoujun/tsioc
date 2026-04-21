"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateCompiler = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const effect_1 = require("../effect");
let TemplateCompiler = class TemplateCompiler {
    constructor() {
        this[_a] = true;
    }
};
exports.TemplateCompiler = TemplateCompiler;
_a = effect_1.noReact;
exports.TemplateCompiler = TemplateCompiler = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], TemplateCompiler);
//# sourceMappingURL=compiler.js.map