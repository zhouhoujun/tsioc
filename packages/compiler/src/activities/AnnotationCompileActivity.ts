import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { Attribute, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import * as globby from 'globby';

export interface AnnotationCompileOptions {
    outDir?: string;
    outFile?: string;
    includeDecorators?: string[];
    excludeDecorators?: string[];
}

export interface AnnotationResult {
    file: string;
    outputFile: string;
    classesProcessed: number;
}

@Directive({ selector: 'annotation-compile' })
export class AnnotationCompileActivity extends Activity {

    @Attribute()
    src = 'src/**/*.ts';

    @Attribute()
    outDir = 'lib';

    @Attribute()
    options: AnnotationCompileOptions = {};

    @Attribute()
    exclude: string[] = ['node_modules', '**/*.spec.ts', '**/*.test.ts'];

    async execute(context: ActivityContext): Promise<ActivityResult> {
        const startTime = Date.now();

        try {
            const patterns = [this.src, ...this.exclude.map(e => `!${e}`)];
            const filePaths = await globby(patterns, { cwd: process.cwd() });

            const results: AnnotationResult[] = [];

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
        } catch (error) {
            return {
                success: false,
                error: error as Error
            };
        }
    }

    private async compileFile(filePath: string): Promise<AnnotationResult> {
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

    private processSourceFile(sourceFile: ts.SourceFile): number {
        let count = 0;
        ts.forEachChild(sourceFile, (node) => {
            if (ts.isClassDeclaration(node) && node.name) {
                count++;
            }
        });
        return count;
    }

    private transformSourceFile(sourceFile: ts.SourceFile): string {
        const printer = ts.createPrinter();
        return printer.printFile(sourceFile);
    }
}
