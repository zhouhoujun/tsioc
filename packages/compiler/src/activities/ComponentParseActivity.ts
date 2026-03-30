import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { Attribute, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import * as globby from 'globby';

export type DecoratorType = 'Component' | 'Directive' | 'Pipe' | 'Injectable' | 'Service' | 'Module';

export interface ComponentCompileInfo {
    name: string;
    decoratorType: DecoratorType;
    selector?: string;
    templateUrl?: string;
    template?: string;
    styleUrls?: string[];
    styles?: string[];
    viewEncapsulation?: 'None' | 'Emulated' | 'ShadowDom';
    changeDetection?: 'Default' | 'OnPush';
    inputs?: string[];
    outputs?: string[];
    providers?: string[];
    imports?: string[];
    exports?: string[];
    declarations?: string[];
}

export interface ComponentParseResult {
    file: string;
    componentInfo?: ComponentCompileInfo;
}

@Directive({ selector: 'component-parse' })
export class ComponentParseActivity extends Activity {

    @Attribute()
    src = 'src/**/*.ts';

    @Attribute()
    exclude: string[] = ['node_modules', '**/*.spec.ts', '**/*.test.ts'];

    @Attribute()
    inlineTemplate = false;

    async execute(context: ActivityContext): Promise<ActivityResult> {
        try {
            const patterns = [this.src, ...this.exclude.map(e => `!${e}`)];
            const filePaths = await globby(patterns);

            const results: ComponentParseResult[] = [];

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
        } catch (error) {
            return {
                success: false,
                error: error as Error
            };
        }
    }

    private extractComponentInfo(content: string): ComponentCompileInfo | undefined {
        const sourceFile = ts.createSourceFile('temp.ts', content, ts.ScriptTarget.Latest, true);
        let componentInfo: ComponentCompileInfo | undefined;

        const visit = (node: ts.Node) => {
            if (ts.isDecorator(node)) {
                const expression = node.expression;
                let decoratorName = '';
                let decoratorType: DecoratorType | undefined;

                if (ts.isIdentifier(expression)) {
                    decoratorName = expression.text;
                } else if (ts.isCallExpression(expression)) {
                    decoratorName = ts.isIdentifier(expression.expression) ? expression.expression.text : '';
                }

                if (decoratorName === 'Component') {
                    decoratorType = 'Component';
                } else if (decoratorName === 'Directive') {
                    decoratorType = 'Directive';
                } else if (decoratorName === 'Pipe') {
                    decoratorType = 'Pipe';
                } else if (decoratorName === 'Injectable') {
                    decoratorType = 'Injectable';
                } else if (decoratorName === 'Service') {
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

    private parseDecoratorOptions(decoratorType: DecoratorType, arg: ts.ObjectLiteralExpression): ComponentCompileInfo {
        const info: ComponentCompileInfo = {
            name: '',
            decoratorType
        };

        arg.properties.forEach((prop: ts.ObjectLiteralElementLike) => {
            if (!ts.isPropertyAssignment(prop)) return;

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
                        info.viewEncapsulation = value.text as any;
                    }
                    break;
                case 'changeDetection':
                    if (ts.isIdentifier(value)) {
                        info.changeDetection = value.text as any;
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
}
