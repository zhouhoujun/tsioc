import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { Annotation, MethodAnnotation } from '@tsdi/ioc';

export interface ClassMetadata {
    __symbolic: 'class';
    name: string;
    decorators?: DecoratorMetadata[];
    members?: Record<string, MemberMetadata[]>;
    statics?: Record<string, StaticMetadata>;
}

export interface DecoratorMetadata {
    name: string;
    type?: string;
    arguments?: any[];
    identifier?: string;
    module?: string;
}

export interface MemberMetadata {
    __symbolic: 'constructor' | 'property' | 'method';
    decorators?: DecoratorMetadata[];
    parameters?: ParameterMetadata[];
    type?: string;
    returnType?: string;
}

export interface ParameterMetadata {
    type?: string;
    name?: string;
    decorators?: DecoratorMetadata[];
    optional?: boolean;
}

export interface StaticMetadata {
    __symbolic: 'function';
    parameters: ParameterMetadata[];
    value?: any;
}

export interface ModuleMetadata {
    __symbolic: 'module';
    version: number;
    metadata: Record<string, ClassMetadata>;
    origins: Record<string, string>;
}

export interface MetadataCompilerOptions {
    version?: number;
    includeClassMetadata?: boolean;
    includeDecoratorArgs?: boolean;
    flattenDeclarations?: boolean;
}

export class MetadataGenerator {
    private typeChecker: ts.TypeChecker | null = null;
    private program: ts.Program | null = null;
    private options: MetadataCompilerOptions;

    constructor(options: MetadataCompilerOptions = {}) {
        this.options = {
            version: 4,
            includeClassMetadata: true,
            includeDecoratorArgs: true,
            flattenDeclarations: true,
            ...options
        };
    }

    compile(sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker): ClassMetadata[] {
        this.typeChecker = typeChecker;
        const metadata: ClassMetadata[] = [];

        ts.forEachChild(sourceFile, (node) => {
            if (ts.isClassDeclaration(node) && node.name) {
                const classMeta = this.extractClassMetadata(node, sourceFile);
                if (classMeta) {
                    metadata.push(classMeta);
                }
            }
        });

        return metadata;
    }

    compileModule(
        filePath: string,
        compilerOptions: ts.CompilerOptions
    ): ModuleMetadata {
        this.program = ts.createProgram([filePath], compilerOptions);
        this.typeChecker = this.program.getTypeChecker();
        const sourceFile = this.program.getSourceFile(filePath)!;
        
        const metadata: Record<string, ClassMetadata> = {};
        const origins: Record<string, string> = {};

        ts.forEachChild(sourceFile, (node) => {
            if (ts.isClassDeclaration(node) && node.name) {
                const classMeta = this.extractClassMetadata(node, sourceFile);
                if (classMeta) {
                    const name = node.name.text;
                    metadata[name] = classMeta;
                    origins[name] = './' + path.basename(filePath, '.ts');
                }
            }
        });

        return {
            __symbolic: 'module',
            version: this.options.version!,
            metadata,
            origins
        };
    }

    private extractClassMetadata(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): ClassMetadata | null {
        const name = node.name?.text || 'Anonymous';
        
        const classMeta: ClassMetadata = {
            __symbolic: 'class',
            name
        };

        const decorators = this.extractClassDecorators(node);
        if (decorators.length > 0) {
            classMeta.decorators = decorators;
        }

        const members = this.extractMembers(node, sourceFile);
        if (Object.keys(members).length > 0) {
            classMeta.members = members;
        }

        return classMeta;
    }

    private extractClassDecorators(node: ts.ClassDeclaration): DecoratorMetadata[] {
        const decorators: DecoratorMetadata[] = [];
        
        if (!ts.canHaveDecorators(node)) {
            return decorators;
        }

        const nodeDecorators = ts.getDecorators(node);
        if (!nodeDecorators) {
            return decorators;
        }

        for (const decorator of nodeDecorators) {
            const meta = this.parseDecorator(decorator);
            if (meta) {
                decorators.push(meta);
            }
        }

        return decorators;
    }

    private parseDecorator(decorator: ts.Decorator): DecoratorMetadata | null {
        const expr = decorator.expression;

        if (ts.isIdentifier(expr)) {
            return { name: expr.text };
        }

        if (ts.isCallExpression(expr)) {
            const name = ts.isIdentifier(expr.expression) ? expr.expression.text : 'Unknown';
            const args = this.options.includeDecoratorArgs 
                ? expr.arguments.map(arg => this.serializeValue(arg))
                : undefined;
            
            return { name, arguments: args };
        }

        return null;
    }

    private extractMembers(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): Record<string, MemberMetadata[]> {
        const members: Record<string, MemberMetadata[]> = {};

        for (const member of node.members) {
            if (ts.isConstructorDeclaration(member)) {
                const params = this.extractParameters(member);
                if (params.length > 0) {
                    members['__ctor__'] = [{
                        __symbolic: 'constructor',
                        parameters: params
                    }];
                }
            } else if (ts.isPropertyDeclaration(member) && member.name) {
                if (ts.canHaveDecorators(member) && ts.getDecorators(member)) {
                    const propName = ts.isIdentifier(member.name) ? member.name.text : member.name.getText();
                    const decorators = this.extractMemberDecorators(member);
                    if (decorators.length > 0) {
                        members[propName] = [{
                            __symbolic: 'property',
                            decorators
                        }];
                    }
                }
            } else if (ts.isMethodDeclaration(member) && member.name) {
                const methodName = ts.isIdentifier(member.name) ? member.name.text : member.name.getText();
                const memberMeta: MemberMetadata = { __symbolic: 'method' };
                
                if (ts.canHaveDecorators(member) && ts.getDecorators(member)) {
                    memberMeta.decorators = this.extractMemberDecorators(member);
                }
                
                if (member.parameters.length > 0) {
                    memberMeta.parameters = this.extractParameters(member);
                }
                
                if (member.type) {
                    memberMeta.returnType = member.type.getText();
                }
                
                if (memberMeta.decorators || memberMeta.parameters) {
                    members[methodName] = [memberMeta];
                }
            }
        }

        return members;
    }

    private extractParameters(node: ts.MethodDeclaration | ts.ConstructorDeclaration): ParameterMetadata[] {
        return node.parameters.map(param => {
            const paramMeta: ParameterMetadata = {
                type: param.type?.getText(),
                name: ts.isIdentifier(param.name) ? param.name.text : undefined,
                optional: param.questionToken !== undefined
            };

            if (ts.canHaveDecorators(param) && ts.getDecorators(param)) {
                paramMeta.decorators = this.extractMemberDecorators(param);
            }

            return paramMeta;
        });
    }

    private extractMemberDecorators(node: ts.Node): DecoratorMetadata[] {
        const decorators: DecoratorMetadata[] = [];
        
        if (!ts.canHaveDecorators(node)) {
            return decorators;
        }

        const nodeDecorators = ts.getDecorators(node);
        if (!nodeDecorators) {
            return decorators;
        }

        for (const decorator of nodeDecorators) {
            const meta = this.parseDecorator(decorator);
            if (meta) {
                decorators.push(meta);
            }
        }

        return decorators;
    }

    private serializeValue(node: ts.Node): any {
        if (ts.isStringLiteral(node)) {
            return node.text;
        }
        if (ts.isNumericLiteral(node)) {
            return Number(node.text);
        }
        if (node.kind === ts.SyntaxKind.TrueKeyword) {
            return true;
        }
        if (node.kind === ts.SyntaxKind.FalseKeyword) {
            return false;
        }
        if (node.kind === ts.SyntaxKind.NullKeyword) {
            return null;
        }
        if (ts.isObjectLiteralExpression(node)) {
            const obj: Record<string, any> = {};
            node.properties.forEach(prop => {
                if (ts.isPropertyAssignment(prop)) {
                    const key = ts.isIdentifier(prop.name) ? prop.name.text : prop.name.getText();
                    obj[key] = this.serializeValue(prop.initializer);
                }
            });
            return { __symbolic: 'object', value: obj };
        }
        if (ts.isArrayLiteralExpression(node)) {
            return { __symbolic: 'array', value: node.elements.map(e => this.serializeValue(e)) };
        }
        if (ts.isIdentifier(node)) {
            return { __symbolic: 'reference', name: node.text };
        }
        if (ts.isPropertyAccessExpression(node)) {
            return {
                __symbolic: 'select',
                expression: this.serializeValue(node.expression),
                member: node.name.text
            };
        }
        return { __symbolic: 'unknown', value: node.getText() };
    }

    writeMetadataFile(moduleMetadata: ModuleMetadata, outputPath: string): void {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(outputPath, JSON.stringify(moduleMetadata, null, 2), 'utf-8');
    }

    compileAnnotation(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): Annotation | null {
        const name = node.name?.text || 'Anonymous';
        const annotation: Annotation = {
            name,
            type: node as any
        };

        const abstract = node.modifiers?.some(m => m.getText() === 'abstract');
        if (abstract) {
            annotation.abstract = true;
        }

        const methods: Record<string, MethodAnnotation> = {};
        
        for (const member of node.members) {
            if (ts.isConstructorDeclaration(member) && member.parameters.length > 0) {
                methods['constructor'] = {
                    params: member.parameters.map(p => ({
                        name: ts.isIdentifier(p.name) ? p.name.text : p.name.getText(),
                        type: p.type ? { name: p.type.getText() } as any : undefined
                    }))
                };
            } else if (ts.isMethodDeclaration(member) && member.name) {
                const methodName = ts.isIdentifier(member.name) ? member.name.text : member.name.getText();
                if (member.parameters.length > 0 || member.type) {
                    methods[methodName] = {
                        params: member.parameters.map(p => ({
                            name: ts.isIdentifier(p.name) ? p.name.text : p.name.getText(),
                            type: p.type ? { name: p.type.getText() } as any : undefined
                        })),
                        returnType: member.type ? { name: member.type.getText() } as any : undefined
                    };
                }
            }
        }

        if (Object.keys(methods).length > 0) {
            annotation.methods = methods;
        }

        return annotation;
    }
}