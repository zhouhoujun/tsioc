/* eslint-disable @typescript-eslint/no-var-requires */
import { Attribute, Component } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import { DiagnosticInfo } from './CompileActivity';

export interface TestGenerateOptions {
    framework: 'jest' | 'mocha' | 'jasmine' | 'karma';
    coverage: boolean;
    coverageThreshold: number;
    includePrivate: boolean;
    outputDir: string;
    filePattern: string;
}

export interface TestGenerateResult {
    success: boolean;
    file: string;
    testFile: string;
    testCases: TestCaseInfo[];
    diagnostics?: DiagnosticInfo[];
    error?: Error;
}

export interface TestCaseInfo {
    name: string;
    type: 'unit' | 'integration' | 'e2e';
    target: string;
    description?: string;
}

@Component({ selector: 'test-generate' })
export class TestGenerateActivity extends Activity {

    @Attribute()
    src = 'src/**/*.ts';

    @Attribute()
    outputDir = 'test';

    @Attribute()
    options: Partial<TestGenerateOptions> = {};

    @Attribute()
    exclude: string[] = ['node_modules', '**/*.spec.ts', '**/*.test.ts', '**/index.ts'];

    async execute(context: ActivityContext): Promise<ActivityResult> {
        const results: TestGenerateResult[] = [];

        try {
            const files = await this.getSourceFiles();
            
            for (const file of files) {
                const result = await this.generateTests(file);
                results.push(result);
            }

            const success = results.every(r => r.success);
            const totalTestCases = results.reduce((sum, r) => sum + r.testCases.length, 0);

            return {
                success,
                data: {
                    totalFiles: results.length,
                    successCount: results.filter(r => r.success).length,
                    errorCount: results.filter(r => !r.success).length,
                    totalTestCases,
                    results
                },
                error: results.some(r => !r.success) ? new Error('Some test files failed to generate') : undefined
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error
            };
        }
    }

    private async getSourceFiles(): Promise<{ fileName: string; filePath: string; content: string }[]> {
        const globby = require('globby');
        const fs = require('fs');
        const path = require('path');

        const patterns = [this.src, ...this.exclude.map(e => `!${e}`)];
        const filePaths = await globby(patterns);

        return filePaths.map((filePath: string) => ({
            fileName: path.basename(filePath),
            filePath,
            content: fs.readFileSync(filePath, 'utf-8')
        }));
    }

    private async generateTests(sourceFile: { fileName: string; filePath: string; content: string }): Promise<TestGenerateResult> {
        const path = require('path');
        const fs = require('fs');

        try {
            const exportedItems = this.extractExports(sourceFile.content);
            const testCases: TestCaseInfo[] = [];

            for (const item of exportedItems) {
                testCases.push({
                    name: `should create ${item.name} instance`,
                    type: 'unit',
                    target: item.name,
                    description: `Test ${item.type} ${item.name}`
                });

                if (item.type === 'class') {
                    const methods = this.extractMethods(sourceFile.content, item.name);
                    for (const method of methods) {
                        testCases.push({
                            name: `should execute ${item.name}.${method} correctly`,
                            type: 'unit',
                            target: `${item.name}.${method}`,
                            description: `Test method ${method}`
                        });
                    }
                }
            }

            const testContent = this.generateTestFile(sourceFile.fileName, exportedItems, testCases);
            
            const testFileName = sourceFile.fileName.replace('.ts', '.spec.ts');
            const testFilePath = path.join(this.outputDir, testFileName);

            const outputDir = path.dirname(testFilePath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            fs.writeFileSync(testFilePath, testContent);

            return {
                success: true,
                file: sourceFile.filePath,
                testFile: testFilePath,
                testCases
            };
        } catch (error) {
            return {
                success: false,
                file: sourceFile.filePath,
                testFile: '',
                testCases: [],
                error: error as Error
            };
        }
    }

    private extractExports(content: string): { name: string; type: 'class' | 'interface' | 'function' | 'const' }[] {
        const ts = require('typescript');
        const items: { name: string; type: 'class' | 'interface' | 'function' | 'const' }[] = [];

        const sourceFile = ts.createSourceFile('temp.ts', content, ts.ScriptTarget.Latest, true);

        const visit = (node: any) => {
            if (ts.isClassDeclaration(node) && node.name) {
                items.push({ name: node.name.text, type: 'class' });
            } else if (ts.isInterfaceDeclaration(node)) {
                items.push({ name: node.name.text, type: 'interface' });
            } else if (ts.isFunctionDeclaration(node) && node.name) {
                items.push({ name: node.name.text, type: 'function' });
            } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
                items.push({ name: node.name.text, type: 'const' });
            }
            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        return items;
    }

    private extractMethods(content: string, className: string): string[] {
        const ts = require('typescript');
        const methods: string[] = [];

        const sourceFile = ts.createSourceFile('temp.ts', content, ts.ScriptTarget.Latest, true);

        const visit = (node: any) => {
            if (ts.isClassDeclaration(node) && node.name?.text === className) {
                node.members.forEach((member: any) => {
                    if (ts.isMethodDeclaration(member) && member.name) {
                        methods.push(member.name.getText());
                    }
                });
            }
            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        return methods;
    }

    private generateTestFile(
        sourceFileName: string,
        exportedItems: { name: string; type: string }[],
        testCases: TestCaseInfo[]
    ): string {
        const importPath = sourceFileName.replace('.ts', '');
        const className = sourceFileName.replace('.ts', '').split('/').pop();
        
        let content = `import expect = require('expect');\n`;
        content += `import { ${exportedItems.map(i => i.name).join(', ')} } from '../src/${importPath.replace('src/', '')}';\n\n`;
        
        content += `describe('${className}', () => {\n`;
        
        testCases.forEach((testCase, index) => {
            content += `    it('${testCase.name}', async () => {\n`;
            
            if (testCase.target.includes('.')) {
                const [cls, method] = testCase.target.split('.');
                content += `        const instance = new ${cls}();\n`;
                content += `        const result = await instance.${method}({});\n`;
                content += `        expect(result).toBeDefined();\n`;
            } else {
                content += `        const instance = new ${testCase.target}();\n`;
                content += `        expect(instance).toBeDefined();\n`;
                content += `        expect(instance).toBeInstanceOf(${testCase.target});\n`;
            }
            
            content += `    });\n\n`;
        });
        
        content += `});\n`;

        return content;
    }
}