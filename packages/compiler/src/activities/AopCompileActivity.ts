import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { Attribute, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from '@tsdi/activities';
import * as globby from 'globby';

export type AopAdviceType =
    | 'Before'
    | 'After'
    | 'Around'
    | 'AfterReturning'
    | 'AfterThrowing'
    | 'Advice';

export interface AopAdviceInfo {
    name: string;
    type: AopAdviceType;
    pointcut: string;
    joinPoint: boolean;
    line: number;
}

export interface AopAspectInfo {
    file: string;
    className: string;
    options: string;
    pointcuts: Array<{ name: string; pointcut: string; line: number }>;
    advices: AopAdviceInfo[];
}

export interface AopCompileDiagnostic {
    file: string;
    line: number;
    message: string;
}

export interface AopCompileOptions {
    outFile?: string;
    strict?: boolean;
}

const ADVICE_DECORATORS: AopAdviceType[] = [
    'Before',
    'After',
    'Around',
    'AfterReturning',
    'AfterThrowing',
    'Advice'
];

/**
 * Compile-time AOP metadata pass.
 *
 * Scans source files for `@Aspect` classes and their pointcuts/advices, emits a
 * compact `aop-manifest.json` and validates advice declarations. Runtime advice
 * registration still uses the decorators; this pass gives builds a stable,
 * inspectable aspect graph and catches broken pointcut declarations early.
 */
@Directive({ selector: 'aop-compile' })
export class AopCompileActivity extends Activity {

    @Attribute()
    src = 'src/**/*.ts';

    @Attribute()
    outDir = 'lib';

    @Attribute()
    outFile = 'aop-manifest.json';

    @Attribute()
    strict = true;

    @Attribute()
    exclude: string[] = ['node_modules', '**/*.spec.ts', '**/*.test.ts'];

    async execute(_context: ActivityContext): Promise<ActivityResult> {
        const startTime = Date.now();
        try {
            const patterns = [this.src, ...this.exclude.map(item => `!${item}`)];
            const files = await globby(patterns, { cwd: process.cwd() });
            const aspects: AopAspectInfo[] = [];
            const errors: AopCompileDiagnostic[] = [];
            for (const file of files) {
                const content = fs.readFileSync(file, 'utf-8');
                this.compileFile(file, content, aspects, errors);
            }
            const manifest = {
                version: 1,
                generatedAt: new Date().toISOString(),
                aspects
            };
            const outDir = path.isAbsolute(this.outDir) ? this.outDir : path.resolve(process.cwd(), this.outDir);
            fs.mkdirSync(outDir, { recursive: true });
            const manifestFile = path.join(outDir, this.outFile || 'aop-manifest.json');
            fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf-8');
            const success = !this.strict || errors.length === 0;
            return {
                success,
                data: {
                    aspects,
                    manifestFile,
                    errors,
                    duration: Date.now() - startTime
                },
                error: success ? undefined : new Error(`${errors.length} AOP compile error(s)`)
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error
            };
        }
    }

    protected compileFile(
        file: string,
        content: string,
        aspects: AopAspectInfo[],
        errors: AopCompileDiagnostic[]
    ): void {
        const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
        sourceFile.forEachChild(node => {
            if (!ts.isClassDeclaration(node) || !node.name) {
                return;
            }
            const aspectDecorator = this.findDecorator(node, 'Aspect');
            if (!aspectDecorator) {
                return;
            }
            const aspect: AopAspectInfo = {
                file,
                className: node.name.text,
                options: this.decoratorArgument(aspectDecorator),
                pointcuts: [],
                advices: []
            };
            node.members.forEach(member => {
                if (!ts.isMethodDeclaration(member) || !member.name) {
                    return;
                }
                const methodName = this.memberName(member.name);
                const pointcutDecorator = this.findDecorator(member, 'Pointcut');
                if (pointcutDecorator) {
                    const pointcut = this.decoratorArgument(pointcutDecorator);
                    if (!pointcut) {
                        errors.push({
                            file,
                            line: this.lineOf(sourceFile, pointcutDecorator),
                            message: `@Pointcut on ${aspect.className}.${methodName} requires an expression`
                        });
                    }
                    aspect.pointcuts.push({
                        name: methodName,
                        pointcut,
                        line: this.lineOf(sourceFile, pointcutDecorator)
                    });
                }
                for (const type of ADVICE_DECORATORS) {
                    const adviceDecorator = this.findDecorator(member, type);
                    if (!adviceDecorator) {
                        continue;
                    }
                    const pointcut = this.decoratorArgument(adviceDecorator);
                    if (!pointcut && type !== 'Advice') {
                        errors.push({
                            file,
                            line: this.lineOf(sourceFile, adviceDecorator),
                            message: `@${type} on ${aspect.className}.${methodName} requires a pointcut expression`
                        });
                    }
                    aspect.advices.push({
                        name: methodName,
                        type,
                        pointcut,
                        joinPoint: this.hasJoinPointParameter(member),
                        line: this.lineOf(sourceFile, adviceDecorator)
                    });
                    break;
                }
            });
            aspects.push(aspect);
        });
    }

    protected findDecorator(node: ts.Node, name: string): ts.Decorator | undefined {
        const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
        return decorators?.find(decorator => {
            const expression = decorator.expression;
            if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
                return expression.expression.text === name;
            }
            return ts.isIdentifier(expression) && expression.text === name;
        });
    }

    protected decoratorArgument(decorator: ts.Decorator): string {
        if (!ts.isCallExpression(decorator.expression) || !decorator.expression.arguments.length) {
            return '';
        }
        const argument = decorator.expression.arguments[0];
        if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) {
            return argument.text;
        }
        return argument.getText().trim();
    }

    protected memberName(name: ts.PropertyName): string {
        if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
            return name.text;
        }
        return name.getText();
    }

    protected hasJoinPointParameter(method: ts.MethodDeclaration): boolean {
        return method.parameters.some(parameter => {
            const type = parameter.type?.getText() || '';
            if (type.includes('JoinPoint')) {
                return true;
            }
            if (ts.isIdentifier(parameter.name)) {
                const name = parameter.name.text.toLowerCase();
                return name.includes('joinpoint') || name === 'jp';
            }
            return false;
        });
    }

    protected lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
        return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    }
}
