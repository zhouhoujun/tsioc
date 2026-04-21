"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractTemplateCompiler = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const compiler_1 = require("../template/compiler");
const template_1 = require("./template");
const compiler_fns_1 = require("./compiler-fns");
let AbstractTemplateCompiler = class AbstractTemplateCompiler extends compiler_1.TemplateCompiler {
    get delimiter() {
        if (!this._delimiter) {
            const [open, close] = this.options.delimiters || ['{{', '}}'];
            this._delimiter = new RegExp(`${open}(.*?)${close}`, 'g');
        }
        return this._delimiter;
    }
    /**
     * 编译模板并返回 TemplateFactory
     */
    compile(template, options) {
        const nodes = this.parser.parse(template);
        (0, compiler_fns_1.generateNodeBindings)(nodes, options.directives, options.components, this.renderer, this.delimiter, undefined, options.customElements);
        // 将模板编译为 node factory
        const factory = (0, compiler_fns_1.compileToFactory)(nodes, this.renderer, options, {
            delimiter: this.delimiter,
            textFactory: compiler_fns_1.compileTextToFactory,
            elementFactory: compiler_fns_1.compileElementToFactory,
            attributeFactory: compiler_fns_1.compileAttributeToFactory,
            componentFactory: compiler_fns_1.compileComponentToFactory,
            templateFactory: compiler_fns_1.compileTemplateToFactory,
            bindDirective: compiler_fns_1.applyDirectiveToElement,
        });
        return (host, injector) => (0, template_1.createTemplateRef)(factory, host, { injector });
    }
};
exports.AbstractTemplateCompiler = AbstractTemplateCompiler;
exports.AbstractTemplateCompiler = AbstractTemplateCompiler = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], AbstractTemplateCompiler);
//# sourceMappingURL=compiler.js.map