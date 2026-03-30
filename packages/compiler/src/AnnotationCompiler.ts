import * as ts from 'typescript';
import { typeAnn, Annotation, MethodAnnotation, TypeDef, DecorDefine } from '@tsdi/ioc';

export interface CompiledTypeDef extends Annotation {
    compiled: true;
    provides?: any[];
    providers?: any[];
    propDefs?: CompiledPropDefine[];
    methodDefs?: CompiledMethodDefine[];
    paramDefs?: Record<string, CompiledParamDefine[]>;
    classDefs?: CompiledDecorDefine[];
    singleton?: boolean;
    static?: boolean;
    module?: boolean;
    providedIn?: any;
}

export interface CompiledDecorDefine {
    decorType: 'class' | 'property' | 'method' | 'parameter';
    decorator: string;
    propertyKey?: string;
    parameterIndex?: number;
    metadata?: any;
}

export interface CompiledPropDefine extends CompiledDecorDefine {
    type?: string;
}

export interface CompiledMethodDefine extends CompiledDecorDefine {
    returnType?: string;
}

export interface CompiledParamDefine extends CompiledDecorDefine {
    paramName?: string;
    paramType?: string;
    nullable?: boolean;
}

const KNOWN_DECORATORS = new Map<string, { type: string; singleton?: boolean; static?: boolean }>([
    ['Injectable', { type: 'annoation' }],
    ['Singleton', { type: 'annoation', singleton: true }],
    ['Static', { type: 'annoation', static: true }],
    ['Module', { type: 'module' }],
    ['Inject', { type: 'inject' }],
    ['Autowired', { type: 'inject' }],
    ['Param', { type: 'inject' }],
    ['Optional', { type: 'inject' }],
    ['Nullable', { type: 'inject' }],
    ['Providers', { type: 'providers' }],
    ['ProvidedIn', { type: 'ref' }]
]);

export class AnnotationCompiler {
    private typeChecker: ts.TypeChecker | null = null;
    private program: ts.Program | null = null;

    createTransformerFactory(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
        this.program = program;
        this.typeChecker = program.getTypeChecker();
        return (context: ts.TransformationContext) => (sourceFile: ts.SourceFile) => this.transform(sourceFile, context);
    }

    private transform(sourceFile: ts.SourceFile, context: ts.TransformationContext): ts.SourceFile {
        const statements: ts.Statement[] = [];
        
        for (const stmt of sourceFile.statements) {
            if (ts.isClassDeclaration(stmt)) {
                const result = this.transformClass(stmt, sourceFile);
                statements.push(...result.statements);
            } else {
                statements.push(stmt);
            }
        }
        
        return ts.factory.updateSourceFile(sourceFile, statements);
    }

    private transformClass(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): { statements: ts.Statement[] } {
        const className = node.name?.text || 'Anonymous';
        const typeDef = this.extractTypeDef(node, sourceFile);
        
        const constStmt = ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList([
                ts.factory.createVariableDeclaration(
                    `ƿAnn_${className}`,
                    undefined,
                    undefined,
                    this.createTypeDefLiteral(typeDef, className)
                )
            ], ts.NodeFlags.Const)
        );

        const methodDecl = ts.factory.createMethodDeclaration(
            [ts.factory.createToken(ts.SyntaxKind.StaticKeyword)],
            undefined,
            typeAnn,
            undefined,
            undefined,
            [],
            undefined,
            ts.factory.createBlock([
                ts.factory.createReturnStatement(ts.factory.createIdentifier(`ƿAnn_${className}`))
            ], true)
        );

        const newClass = ts.factory.updateClassDeclaration(
            node,
            node.modifiers,
            node.name,
            node.typeParameters,
            node.heritageClauses,
            [...node.members, methodDecl]
        );

        return { statements: [constStmt, newClass] };
    }

    private extractTypeDef(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): CompiledTypeDef {
        const name = node.name?.text || 'Anonymous';
        
        const typeDef: CompiledTypeDef = {
            name,
            type: {} as any,
            compiled: true,
            provides: [],
            providers: [],
            classDefs: [],
            propDefs: [],
            methodDefs: [],
            paramDefs: {}
        };

        if (node.modifiers?.some(m => m.getText() === 'abstract')) {
            typeDef.abstract = true;
        }

        this.extractClassDecorators(node, typeDef);
        this.extractMembers(node, sourceFile, typeDef);

        return typeDef;
    }

    private extractClassDecorators(node: ts.ClassDeclaration, typeDef: CompiledTypeDef): void {
        if (!ts.canHaveDecorators(node)) return;
        const decorators = ts.getDecorators(node);
        if (!decorators?.length) return;

        for (const dec of decorators) {
            const parsed = this.parseDecorator(dec);
            if (!parsed) continue;

            typeDef.classDefs!.push({
                decorType: 'class',
                decorator: parsed.name,
                metadata: parsed.args?.[0]
            });

            const known = KNOWN_DECORATORS.get(parsed.name);
            if (known) {
                if (known.singleton) typeDef.singleton = true;
                if (known.static) typeDef.static = true;
                if (known.type === 'module') typeDef.module = true;

                if (parsed.args?.[0]) {
                    const meta = parsed.args[0];
                    if (meta.provide) typeDef.provides!.push(meta.provide);
                    if (meta.providers) typeDef.providers!.push(...meta.providers);
                    if (meta.providedIn) typeDef.providedIn = meta.providedIn;
                }
            }
        }
    }

    private extractMembers(node: ts.ClassDeclaration, sourceFile: ts.SourceFile, typeDef: CompiledTypeDef): void {
        const methods: Record<string, MethodAnnotation> = {};

        for (const member of node.members) {
            if (ts.isConstructorDeclaration(member)) {
                this.extractConstructor(member, typeDef, methods);
            } else if (ts.isPropertyDeclaration(member)) {
                this.extractProperty(member, typeDef);
            } else if (ts.isMethodDeclaration(member)) {
                this.extractMethod(member, typeDef, methods);
            }
        }

        if (Object.keys(methods).length > 0) {
            typeDef.methods = methods;
        }
    }

    private extractConstructor(ctor: ts.ConstructorDeclaration, typeDef: CompiledTypeDef, methods: Record<string, MethodAnnotation>): void {
        const params: { name?: string; type?: any }[] = [];
        const paramDefs: CompiledParamDefine[] = [];

        for (let i = 0; i < ctor.parameters.length; i++) {
            const param = ctor.parameters[i];
            const paramName = ts.isIdentifier(param.name) ? param.name.text : param.name.getText();
            const paramType = param.type?.getText();

            params.push({
                name: paramName,
                type: paramType ? { name: paramType } as any : undefined
            });

            const paramDef: CompiledParamDefine = {
                decorType: 'parameter',
                decorator: '',
                propertyKey: 'constructor',
                parameterIndex: i,
                paramName,
                paramType,
                nullable: !!param.questionToken
            };

            if (ts.canHaveDecorators(param)) {
                const decs = ts.getDecorators(param);
                if (decs) {
                    for (const dec of decs) {
                        const parsed = this.parseDecorator(dec);
                        if (parsed) {
                            paramDef.decorator = parsed.name;
                            paramDef.metadata = parsed.args?.[0];
                            if (parsed.name === 'Optional' || parsed.name === 'Nullable') {
                                paramDef.nullable = true;
                            }
                            break;
                        }
                    }
                }
            }

            paramDefs.push(paramDef);
        }

        if (params.length > 0) {
            methods['constructor'] = { params };
        }

        if (paramDefs.length > 0) {
            typeDef.paramDefs!['constructor'] = paramDefs;
        }
    }

    private extractProperty(prop: ts.PropertyDeclaration, typeDef: CompiledTypeDef): void {
        const propName = ts.isIdentifier(prop.name) ? prop.name.text : prop.name.getText();
        
        if (!ts.canHaveDecorators(prop)) return;
        const decs = ts.getDecorators(prop);
        if (!decs?.length) return;

        for (const dec of decs) {
            const parsed = this.parseDecorator(dec);
            if (!parsed) continue;

            typeDef.propDefs!.push({
                decorType: 'property',
                decorator: parsed.name,
                propertyKey: propName,
                type: prop.type?.getText(),
                metadata: parsed.args?.[0]
            });
        }
    }

    private extractMethod(method: ts.MethodDeclaration, typeDef: CompiledTypeDef, methods: Record<string, MethodAnnotation>): void {
        const methodName = ts.isIdentifier(method.name) ? method.name.text : method.name.getText();
        
        const params = method.parameters.map(p => ({
            name: ts.isIdentifier(p.name) ? p.name.text : p.name.getText(),
            type: p.type ? { name: p.type.getText() } as any : undefined
        }));

        if (params.length > 0 || method.type) {
            methods[methodName] = {
                params,
                returnType: method.type ? { name: method.type.getText() } as any : undefined
            };
        }

        if (ts.canHaveDecorators(method)) {
            const decs = ts.getDecorators(method);
            if (decs) {
                for (const dec of decs) {
                    const parsed = this.parseDecorator(dec);
                    if (parsed) {
                        typeDef.methodDefs!.push({
                            decorType: 'method',
                            decorator: parsed.name,
                            propertyKey: methodName,
                            returnType: method.type?.getText(),
                            metadata: parsed.args?.[0]
                        });
                    }
                }
            }
        }
    }

    private parseDecorator(dec: ts.Decorator): { name: string; args?: any[] } | null {
        const expr = dec.expression;
        
        if (ts.isIdentifier(expr)) {
            return { name: expr.text, args: [] };
        }
        
        if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)) {
            return {
                name: expr.expression.text,
                args: expr.arguments.map(a => this.evalNode(a))
            };
        }
        
        return null;
    }

    private evalNode(node: ts.Node): any {
        if (ts.isStringLiteral(node)) return node.text;
        if (ts.isNumericLiteral(node)) return +node.text;
        if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
        if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
        if (node.kind === ts.SyntaxKind.NullKeyword) return null;
        if (ts.isObjectLiteralExpression(node)) {
            const obj: any = {};
            for (const p of node.properties) {
                if (ts.isPropertyAssignment(p)) {
                    const k = ts.isIdentifier(p.name) ? p.name.text : p.name.getText();
                    obj[k] = this.evalNode(p.initializer);
                }
            }
            return obj;
        }
        if (ts.isArrayLiteralExpression(node)) {
            return node.elements.map(e => this.evalNode(e));
        }
        if (ts.isIdentifier(node)) return { __ref: node.text };
        return node.getText();
    }

    private createTypeDefLiteral(typeDef: CompiledTypeDef, className: string): ts.ObjectLiteralExpression {
        const props: ts.ObjectLiteralElementLike[] = [
            ts.factory.createPropertyAssignment('name', ts.factory.createStringLiteral(typeDef.name)),
            ts.factory.createPropertyAssignment('type', ts.factory.createIdentifier(className)),
            ts.factory.createPropertyAssignment('compiled', ts.factory.createTrue())
        ];

        if (typeDef.abstract) props.push(ts.factory.createPropertyAssignment('abstract', ts.factory.createTrue()));
        if (typeDef.singleton) props.push(ts.factory.createPropertyAssignment('singleton', ts.factory.createTrue()));
        if (typeDef.static) props.push(ts.factory.createPropertyAssignment('static', ts.factory.createTrue()));
        if (typeDef.module) props.push(ts.factory.createPropertyAssignment('module', ts.factory.createTrue()));

        if (typeDef.methods && Object.keys(typeDef.methods).length > 0) {
            props.push(ts.factory.createPropertyAssignment('methods', this.createMethodsLiteral(typeDef.methods)));
        }

        if (typeDef.provides?.length) {
            props.push(ts.factory.createPropertyAssignment('provides', ts.factory.createArrayLiteralExpression(
                typeDef.provides.map(p => this.valueToExpr(p))
            )));
        }

        if (typeDef.providers?.length) {
            props.push(ts.factory.createPropertyAssignment('providers', ts.factory.createArrayLiteralExpression(
                typeDef.providers.map(p => this.valueToExpr(p))
            )));
        }

        if (typeDef.classDefs?.length) {
            props.push(ts.factory.createPropertyAssignment('classDefs', ts.factory.createArrayLiteralExpression(
                typeDef.classDefs.map(d => this.createDecorDefLiteral(d))
            )));
        }

        if (typeDef.propDefs?.length) {
            props.push(ts.factory.createPropertyAssignment('propDefs', ts.factory.createArrayLiteralExpression(
                typeDef.propDefs.map(d => this.createDecorDefLiteral(d))
            )));
        }

        if (typeDef.methodDefs?.length) {
            props.push(ts.factory.createPropertyAssignment('methodDefs', ts.factory.createArrayLiteralExpression(
                typeDef.methodDefs.map(d => this.createDecorDefLiteral(d))
            )));
        }

        if (typeDef.paramDefs && Object.keys(typeDef.paramDefs).length > 0) {
            props.push(ts.factory.createPropertyAssignment('paramDefs', this.createParamDefsLiteral(typeDef.paramDefs)));
        }

        return ts.factory.createObjectLiteralExpression(props, true);
    }

    private createMethodsLiteral(methods: Record<string, MethodAnnotation>): ts.ObjectLiteralExpression {
        return ts.factory.createObjectLiteralExpression(
            Object.entries(methods).map(([name, m]) => {
                const mp: ts.ObjectLiteralElementLike[] = [];
                if (m.params?.length) {
                    mp.push(ts.factory.createPropertyAssignment('params', ts.factory.createArrayLiteralExpression(
                        m.params.map(p => ts.factory.createObjectLiteralExpression([
                            p.name ? ts.factory.createPropertyAssignment('name', ts.factory.createStringLiteral(p.name)) : null,
                            p.type ? ts.factory.createPropertyAssignment('type', this.valueToExpr(p.type)) : null
                        ].filter(Boolean) as ts.ObjectLiteralElementLike[], true))
                    )));
                }
                if (m.returnType) {
                    mp.push(ts.factory.createPropertyAssignment('returnType', this.valueToExpr(m.returnType)));
                }
                return ts.factory.createPropertyAssignment(name, ts.factory.createObjectLiteralExpression(mp, true));
            }),
            true
        );
    }

    private createDecorDefLiteral(d: CompiledDecorDefine): ts.ObjectLiteralExpression {
        const props: ts.ObjectLiteralElementLike[] = [
            ts.factory.createPropertyAssignment('decorType', ts.factory.createStringLiteral(d.decorType)),
            ts.factory.createPropertyAssignment('decorator', ts.factory.createStringLiteral(d.decorator))
        ];
        if (d.propertyKey) props.push(ts.factory.createPropertyAssignment('propertyKey', ts.factory.createStringLiteral(d.propertyKey)));
        if (d.parameterIndex !== undefined) props.push(ts.factory.createPropertyAssignment('parameterIndex', ts.factory.createNumericLiteral(d.parameterIndex)));
        if (d.metadata) props.push(ts.factory.createPropertyAssignment('metadata', this.valueToExpr(d.metadata)));
        if ((d as any).type) props.push(ts.factory.createPropertyAssignment('type', ts.factory.createStringLiteral((d as any).type)));
        if ((d as any).returnType) props.push(ts.factory.createPropertyAssignment('returnType', ts.factory.createStringLiteral((d as any).returnType)));
        if ((d as any).paramName) props.push(ts.factory.createPropertyAssignment('paramName', ts.factory.createStringLiteral((d as any).paramName)));
        if ((d as any).paramType) props.push(ts.factory.createPropertyAssignment('paramType', ts.factory.createStringLiteral((d as any).paramType)));
        if ((d as any).nullable) props.push(ts.factory.createPropertyAssignment('nullable', ts.factory.createTrue()));
        return ts.factory.createObjectLiteralExpression(props, true);
    }

    private createParamDefsLiteral(paramDefs: Record<string, CompiledParamDefine[]>): ts.ObjectLiteralExpression {
        return ts.factory.createObjectLiteralExpression(
            Object.entries(paramDefs).map(([method, defs]) =>
                ts.factory.createPropertyAssignment(method, ts.factory.createArrayLiteralExpression(
                    defs.map(d => this.createDecorDefLiteral(d))
                ))
            ),
            true
        );
    }

    private valueToExpr(v: any): ts.Expression {
        if (v === null) return ts.factory.createNull();
        if (v === undefined) return ts.factory.createIdentifier('undefined');
        if (typeof v === 'string') return ts.factory.createStringLiteral(v);
        if (typeof v === 'number') return ts.factory.createNumericLiteral(v);
        if (typeof v === 'boolean') return v ? ts.factory.createTrue() : ts.factory.createFalse();
        if (Array.isArray(v)) return ts.factory.createArrayLiteralExpression(v.map(i => this.valueToExpr(i)));
        if (v?.__ref) return ts.factory.createIdentifier(v.__ref);
        if (typeof v === 'object') {
            return ts.factory.createObjectLiteralExpression(
                Object.entries(v).map(([k, val]) => ts.factory.createPropertyAssignment(k, this.valueToExpr(val))),
                true
            );
        }
        return ts.factory.createStringLiteral(String(v));
    }
}

export function createAnnotationCompiler(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
    return new AnnotationCompiler().createTransformerFactory(program);
}