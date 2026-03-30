import * as ts from 'typescript';
import { typeAnn, Annotation, MethodAnnotation } from '@tsdi/ioc';

export interface ClassAnnotationData extends Annotation {
    decorators?: DecoratorAnnotationData[];
    parameters?: (ParameterAnnotationData | null)[];
    properties?: Record<string, DecoratorAnnotationData[]>;
    methodAnnotations?: Record<string, MethodAnnotation>;
}

export interface DecoratorAnnotationData {
    name: string;
    args?: any[];
    importFrom?: string;
}

export interface ParameterAnnotationData {
    type: string | null;
    decorators?: DecoratorAnnotationData[];
    name?: string;
    optional?: boolean;
}

export interface MethodAnnotationData {
    decorators?: DecoratorAnnotationData[];
    parameters?: (ParameterAnnotationData | null)[];
    returnType?: string | null;
}

export class AnnotationCompiler {
    private typeChecker: ts.TypeChecker | null = null;
    private program: ts.Program | null = null;

    createTransformerFactory(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
        this.program = program;
        this.typeChecker = program.getTypeChecker();

        return (context: ts.TransformationContext) => {
            return (sourceFile: ts.SourceFile) => this.transformSourceFile(sourceFile, context);
        };
    }

    private transformSourceFile(sourceFile: ts.SourceFile, context: ts.TransformationContext): ts.SourceFile {
        const visitor = (node: ts.Node): ts.Node => {
            if (ts.isClassDeclaration(node) && this.hasDecorators(node)) {
                return this.transformClassDeclaration(node, sourceFile);
            }
            return ts.visitEachChild(node, visitor, context);
        };

        const result = ts.visitEachChild(sourceFile, visitor, context);
        return result as ts.SourceFile;
    }

    private hasDecorators(node: ts.ClassDeclaration): boolean {
        return (ts.canHaveDecorators(node) && ts.getDecorators(node) !== undefined) ||
            this.hasDecoratedMembers(node);
    }

    private hasDecoratedMembers(node: ts.ClassDeclaration): boolean {
        for (const member of node.members) {
            if (ts.isConstructorDeclaration(member)) {
                if (member.parameters.length > 0) {
                    return true;
                }
                for (const param of member.parameters) {
                    if (ts.canHaveDecorators(param) && ts.getDecorators(param)) {
                        return true;
                    }
                }
            }
            if (ts.canHaveDecorators(member) && ts.getDecorators(member)) {
                return true;
            }
        }
        return false;
    }

    private transformClassDeclaration(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): ts.ClassDeclaration {
        const className = node.name?.text || 'Anonymous';
        const metadata = this.extractClassMetadata(node, sourceFile);
        
        if (!metadata) {
            return node;
        }

        const annotationsMethod = this.createAnnotationsMethod(className, metadata);
        const annotationConst = this.createAnnotationConst(className, metadata);
        
        const newMembers = [...node.members, annotationsMethod];

        const statements: ts.Statement[] = [];
        ts.forEachChild(sourceFile, child => {
            if (child !== node) {
                statements.push(child as ts.Statement);
            }
        });

        return ts.factory.updateClassDeclaration(
            node,
            node.modifiers,
            node.name,
            node.typeParameters,
            node.heritageClauses,
            newMembers
        );
    }

    private extractClassMetadata(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): ClassAnnotationData | null {
        const name = node.name?.text || 'Anonymous';
        
        const metadata: ClassAnnotationData = { 
            name,
            type: node as any
        };

        const abstract = node.modifiers?.some(m => m.getText() === 'abstract');
        if (abstract) {
            metadata.abstract = true;
        }

        const methods: Record<string, MethodAnnotation> = {};
        
        const constructorDecl = node.members.find(m => ts.isConstructorDeclaration(m)) as ts.ConstructorDeclaration | undefined;
        if (constructorDecl && constructorDecl.parameters.length > 0) {
            const params = constructorDecl.parameters.map(param => ({
                name: ts.isIdentifier(param.name) ? param.name.text : param.name.getText(),
                type: param.type ? { name: param.type.getText() } as any : undefined
            }));
            methods['constructor'] = { params };
            metadata.methods = methods;
        }

        for (const member of node.members) {
            if (ts.isMethodDeclaration(member) && member.name) {
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
            metadata.methods = methods;
        }

        return metadata;
    }

    private createAnnotationsMethod(className: string, metadata: ClassAnnotationData): ts.MethodDeclaration {
        return ts.factory.createMethodDeclaration(
            [ts.factory.createToken(ts.SyntaxKind.StaticKeyword)],
            undefined,
            ts.factory.createIdentifier(typeAnn),
            undefined,
            undefined,
            [],
            undefined,
            ts.factory.createBlock([
                ts.factory.createReturnStatement(
                    ts.factory.createIdentifier(`ƿAnn_${className}`)
                )
            ], true)
        );
    }

    private createAnnotationConst(className: string, metadata: ClassAnnotationData): ts.VariableStatement {
        const properties: ts.ObjectLiteralElementLike[] = [];
        
        properties.push(ts.factory.createPropertyAssignment(
            'name',
            ts.factory.createStringLiteral(metadata.name)
        ));

        if (metadata.abstract) {
            properties.push(ts.factory.createPropertyAssignment(
                'abstract',
                ts.factory.createTrue()
            ));
        }

        properties.push(ts.factory.createPropertyAssignment(
            'type',
            ts.factory.createIdentifier(className)
        ));

        if (metadata.methods && Object.keys(metadata.methods).length > 0) {
            const methodsObj = this.createMethodsObject(metadata.methods);
            properties.push(ts.factory.createPropertyAssignment('methods', methodsObj));
        }

        return ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
                [ts.factory.createVariableDeclaration(
                    ts.factory.createIdentifier(`ƿAnn_${className}`),
                    undefined,
                    undefined,
                    ts.factory.createObjectLiteralExpression(properties, true)
                )],
                ts.NodeFlags.Const
            )
        );
    }

    private createMethodsObject(methods: Record<string, MethodAnnotation>): ts.ObjectLiteralExpression {
        return ts.factory.createObjectLiteralExpression(
            Object.entries(methods).map(([name, method]) =>
                ts.factory.createPropertyAssignment(name, this.createMethodObject(method))
            ),
            true
        );
    }

    private createMethodObject(method: MethodAnnotation): ts.ObjectLiteralExpression {
        const properties: ts.ObjectLiteralElementLike[] = [];

        if (method.params && method.params.length > 0) {
            properties.push(ts.factory.createPropertyAssignment(
                'params',
                ts.factory.createArrayLiteralExpression(
                    method.params.map(p => this.createParamObject(p)),
                    true
                )
            ));
        }

        if (method.returnType) {
            properties.push(ts.factory.createPropertyAssignment(
                'returnType',
                ts.factory.createIdentifier(method.returnType.name || 'Object')
            ));
        }

        return ts.factory.createObjectLiteralExpression(properties, true);
    }

    private createParamObject(param: { name?: string; type?: any }): ts.ObjectLiteralExpression {
        const properties: ts.ObjectLiteralElementLike[] = [];

        if (param.name) {
            properties.push(ts.factory.createPropertyAssignment(
                'name',
                ts.factory.createStringLiteral(param.name)
            ));
        }

        if (param.type?.name) {
            properties.push(ts.factory.createPropertyAssignment(
                'type',
                ts.factory.createIdentifier(param.type.name)
            ));
        }

        return ts.factory.createObjectLiteralExpression(properties, true);
    }
}

export function createAnnotationCompiler(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
    const compiler = new AnnotationCompiler();
    return compiler.createTransformerFactory(program);
}