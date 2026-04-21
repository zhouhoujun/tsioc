"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentParseActivity = void 0;
const tslib_1 = require("tslib");
const ts = require("typescript");
const fs = require("fs");
const components_1 = require("@tsdi/components");
const activities_1 = require("@tsdi/activities");
const globby = require("globby");
let ComponentParseActivity = class ComponentParseActivity extends activities_1.Activity {
    constructor() {
        super(...arguments);
        this.src = 'src/**/*.ts';
        this.exclude = ['node_modules', '**/*.spec.ts', '**/*.test.ts'];
        this.inlineTemplate = false;
    }
    async execute(context) {
        try {
            const patterns = [this.src, ...this.exclude.map(e => `!${e}`)];
            const filePaths = await globby(patterns);
            const results = [];
            for (const filePath of filePaths) {
                const content = fs.readFileSync(filePath, 'utf-8');
                const info = this.extractComponentInfo(content);
                if (info) {
                    results.push({
                        file: filePath,
                        componentInfo: info
                    });
                }
            }
            return {
                success: true,
                data: {
                    totalFiles: results.length,
                    components: results.filter(r => r.componentInfo?.decoratorType === 'Component'),
                    directives: results.filter(r => r.componentInfo?.decoratorType === 'Directive'),
                    pipes: results.filter(r => r.componentInfo?.decoratorType === 'Pipe'),
                    services: results.filter(r => r.componentInfo?.decoratorType === 'Injectable' || r.componentInfo?.decoratorType === 'Service'),
                    results
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
    extractComponentInfo(content) {
        const sourceFile = ts.createSourceFile('temp.ts', content, ts.ScriptTarget.Latest, true);
        let componentInfo;
        const visit = (node) => {
            if (ts.isDecorator(node)) {
                const expression = node.expression;
                let decoratorName = '';
                let decoratorType;
                if (ts.isIdentifier(expression)) {
                    decoratorName = expression.text;
                }
                else if (ts.isCallExpression(expression)) {
                    decoratorName = ts.isIdentifier(expression.expression) ? expression.expression.text : '';
                }
                if (decoratorName === 'Component') {
                    decoratorType = 'Component';
                }
                else if (decoratorName === 'Directive') {
                    decoratorType = 'Directive';
                }
                else if (decoratorName === 'Pipe') {
                    decoratorType = 'Pipe';
                }
                else if (decoratorName === 'Injectable') {
                    decoratorType = 'Injectable';
                }
                else if (decoratorName === 'Service') {
                    decoratorType = 'Service';
                }
                if (decoratorType && ts.isCallExpression(expression) && expression.arguments.length > 0) {
                    const arg = expression.arguments[0];
                    if (ts.isObjectLiteralExpression(arg)) {
                        componentInfo = this.parseDecoratorOptions(decoratorType, arg);
                    }
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return componentInfo;
    }
    parseDecoratorOptions(decoratorType, arg) {
        const info = {
            name: '',
            decoratorType
        };
        arg.properties.forEach((prop) => {
            if (!ts.isPropertyAssignment(prop))
                return;
            const name = prop.name.getText();
            const value = prop.initializer;
            switch (name) {
                case 'selector':
                    if (ts.isStringLiteral(value)) {
                        info.selector = value.text;
                    }
                    break;
                case 'templateUrl':
                    if (ts.isStringLiteral(value)) {
                        if (!this.inlineTemplate) {
                            info.templateUrl = value.text;
                        }
                    }
                    break;
                case 'template':
                    if (ts.isStringLiteral(value)) {
                        info.template = value.text;
                    }
                    break;
                case 'styleUrls':
                    if (ts.isArrayLiteralExpression(value)) {
                        info.styleUrls = value.elements
                            .filter(ts.isStringLiteral)
                            .map(e => e.text);
                    }
                    break;
                case 'styles':
                    if (ts.isArrayLiteralExpression(value)) {
                        info.styles = value.elements
                            .filter(ts.isStringLiteral)
                            .map(e => e.text);
                    }
                    break;
                case 'viewEncapsulation':
                    if (ts.isIdentifier(value)) {
                        info.viewEncapsulation = value.text;
                    }
                    break;
                case 'changeDetection':
                    if (ts.isIdentifier(value)) {
                        info.changeDetection = value.text;
                    }
                    break;
                case 'inputs':
                    if (ts.isArrayLiteralExpression(value)) {
                        info.inputs = value.elements
                            .filter(ts.isStringLiteral)
                            .map(e => e.text);
                    }
                    break;
                case 'outputs':
                    if (ts.isArrayLiteralExpression(value)) {
                        info.outputs = value.elements
                            .filter(ts.isStringLiteral)
                            .map(e => e.text);
                    }
                    break;
                case 'providers':
                    if (ts.isArrayLiteralExpression(value)) {
                        info.providers = value.elements
                            .filter(ts.isIdentifier)
                            .map(e => e.text);
                    }
                    break;
                case 'imports':
                    if (ts.isArrayLiteralExpression(value)) {
                        info.imports = value.elements
                            .filter(ts.isIdentifier)
                            .map(e => e.text);
                    }
                    break;
                case 'exports':
                    if (ts.isArrayLiteralExpression(value)) {
                        info.exports = value.elements
                            .filter(ts.isIdentifier)
                            .map(e => e.text);
                    }
                    break;
                case 'declarations':
                    if (ts.isArrayLiteralExpression(value)) {
                        info.declarations = value.elements
                            .filter(ts.isIdentifier)
                            .map(e => e.text);
                    }
                    break;
            }
        });
        return info;
    }
};
exports.ComponentParseActivity = ComponentParseActivity;
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], ComponentParseActivity.prototype, "src", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Array)
], ComponentParseActivity.prototype, "exclude", void 0);
tslib_1.__decorate([
    (0, components_1.Attribute)(),
    tslib_1.__metadata("design:type", Object)
], ComponentParseActivity.prototype, "inlineTemplate", void 0);
exports.ComponentParseActivity = ComponentParseActivity = tslib_1.__decorate([
    (0, components_1.Directive)({ selector: 'component-parse' })
], ComponentParseActivity);
//# sourceMappingURL=ComponentParseActivity.js.map