import * as ts from 'typescript';

const AOP_DECORATORS = new Set([
    'Aspect', 'Pointcut', 'Before', 'After', 'Around', 'AfterReturning',
    'AfterThrowing', 'Advice', 'NonePointcut'
]);
const AOP_ADVICES = new Set(['Pointcut', 'Before', 'After', 'Around', 'AfterReturning', 'AfterThrowing', 'Advice']);

export interface DecoratorPrecompileOptions {
    /** Lower AOP decorators into direct aspect metadata registration. */
    aop?: boolean;
    /** Emit design:* metadata (needed by IoC injection). Default true. */
    designMetadata?: boolean;
    /** Used to emit Object for interfaces/type-only aliases in design metadata. */
    typeChecker?: ts.TypeChecker;
}

let activeTypeChecker: ts.TypeChecker | undefined;
interface TypeEmitContext {
    sourceFile: ts.SourceFile;
    imports: ts.Statement[];
    aliases: Map<string, string>;
    sequence: { value: number };
}
let activeTypeContext: TypeEmitContext | undefined;

function findValueImport(name: string): { module: string; imported: string; typeOnly: boolean } | undefined {
    const sourceFile = activeTypeContext?.sourceFile;
    if (!sourceFile) {
        return undefined;
    }
    for (const statement of sourceFile.statements) {
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
            continue;
        }
        const clause = statement.importClause;
        if (!clause) continue;
        if (clause.name && clause.name.text === name) {
            return { module: statement.moduleSpecifier.text, imported: 'default', typeOnly: clause.isTypeOnly };
        }
        if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
            for (const element of clause.namedBindings.elements) {
                if (element.name.text === name) {
                    return {
                        module: statement.moduleSpecifier.text,
                        imported: element.propertyName?.text || element.name.text,
                        typeOnly: clause.isTypeOnly || element.isTypeOnly
                    };
                }
            }
        }
    }
    return undefined;
}

function isDeclaredInCurrentSource(name: string): boolean {
    if (!activeTypeContext) {
        return true;
    }
    const sourceFile = activeTypeContext.sourceFile;
    return sourceFile.statements.some(statement => {
        if (ts.isClassDeclaration(statement)
            || ts.isFunctionDeclaration(statement)
            || ts.isEnumDeclaration(statement)
            || ts.isInterfaceDeclaration(statement)
            || ts.isTypeAliasDeclaration(statement)
            || ts.isModuleDeclaration(statement)) {
            return !!statement.name && ts.isIdentifier(statement.name) && statement.name.text === name;
        }
        if (ts.isVariableStatement(statement)) {
            return statement.declarationList.declarations.some(declaration =>
                ts.isIdentifier(declaration.name) && declaration.name.text === name
            );
        }
        return false;
    });
}

function globalValueReference(name: string): ts.Expression {
    const factory = ts.factory;
    if (!activeTypeChecker) {
        return factory.createIdentifier(name);
    }
    return factory.createConditionalExpression(
        factory.createBinaryExpression(
            factory.createTypeOfExpression(factory.createIdentifier(name)),
            ts.SyntaxKind.ExclamationEqualsEqualsToken,
            factory.createStringLiteral('undefined')
        ),
        factory.createToken(ts.SyntaxKind.QuestionToken),
        factory.createIdentifier(name),
        factory.createToken(ts.SyntaxKind.ColonToken),
        factory.createIdentifier('Object')
    );
}

function valueTypeReference(name: string): ts.Expression {
    const imported = findValueImport(name);
    const context = activeTypeContext;
    if (!imported || !context) {
        return isDeclaredInCurrentSource(name)
            ? ts.factory.createIdentifier(name)
            : globalValueReference(name);
    }
    if (!imported.typeOnly) {
        // The import is already a value import; the transformed expression
        // keeps it alive during emit, so reuse it instead of adding an alias.
        return ts.factory.createIdentifier(name);
    }
    const cacheKey = `${imported.module}:${imported.imported}`;
    const cached = context.aliases.get(cacheKey);
    if (cached) {
        return ts.factory.createIdentifier(cached);
    }
    const alias = `__tsdi_value_${context.sequence.value++}`;
    context.aliases.set(cacheKey, alias);
    const specifier = imported.imported === 'default'
        ? ts.factory.createImportDeclaration(
            undefined,
            ts.factory.createImportClause(false, ts.factory.createIdentifier(alias), undefined),
            ts.factory.createStringLiteral(imported.module),
            undefined
        )
        : ts.factory.createImportDeclaration(
            undefined,
            ts.factory.createImportClause(false, undefined, ts.factory.createNamedImports([
                ts.factory.createImportSpecifier(false, ts.factory.createIdentifier(imported.imported), ts.factory.createIdentifier(alias))
            ])),
            ts.factory.createStringLiteral(imported.module),
            undefined
        );
    context.imports.push(specifier);
    return ts.factory.createIdentifier(alias);
}

interface DecoratorRecord {
    expression: ts.Expression;
    kind: 'class' | 'property' | 'method' | 'parameter';
    propertyKey?: string;
    parameterIndex?: number;
    static?: boolean;
}

interface ClassTransform {
    node: ts.ClassDeclaration;
    injections: ts.Statement[];
}

function decoratorsOf(node: ts.Node): readonly ts.Decorator[] {
    return ts.canHaveDecorators(node) ? (ts.getDecorators(node) || []) : [];
}

function decoratorName(decorator: ts.Decorator): string {
    const expression = decorator.expression;
    if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
        return expression.expression.text;
    }
    return ts.isIdentifier(expression) ? expression.text : '';
}

function decoratorArgs(decorator: ts.Decorator): readonly ts.Expression[] {
    return ts.isCallExpression(decorator.expression) ? decorator.expression.arguments : [];
}

function memberKey(member: ts.ClassElement): string | undefined {
    const name = (member as ts.MethodDeclaration | ts.PropertyDeclaration).name;
    if (!name) {
        return undefined;
    }
    return ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)
        ? name.text
        : undefined;
}

function isRuntimeValueType(name: ts.EntityName): boolean {
    if (!activeTypeChecker) {
        return true;
    }
    try {
        let symbol = activeTypeChecker.getSymbolAtLocation(name);
        if (symbol && (symbol.flags & ts.SymbolFlags.Alias)) {
            symbol = activeTypeChecker.getAliasedSymbol(symbol);
        }
        if (!symbol) {
            return false;
        }
        return !!(symbol.flags & (
            ts.SymbolFlags.Class
            | ts.SymbolFlags.Enum
            | ts.SymbolFlags.ConstEnum
            | ts.SymbolFlags.EnumMember
            | ts.SymbolFlags.Function
            | ts.SymbolFlags.Variable
            | ts.SymbolFlags.BlockScopedVariable
            | ts.SymbolFlags.ValueModule
        ));
    } catch {
        return false;
    }
}

function typeExpression(type: ts.TypeNode | undefined): ts.Expression {
    const object = (): ts.Expression => ts.factory.createIdentifier('Object');
    if (!type) {
        return object();
    }
    switch (type.kind) {
        case ts.SyntaxKind.StringKeyword:
            return ts.factory.createIdentifier('String');
        case ts.SyntaxKind.NumberKeyword:
            return ts.factory.createIdentifier('Number');
        case ts.SyntaxKind.BooleanKeyword:
            return ts.factory.createIdentifier('Boolean');
        case ts.SyntaxKind.SymbolKeyword:
            return ts.factory.createIdentifier('Symbol');
        case ts.SyntaxKind.BigIntKeyword:
            return ts.factory.createIdentifier('BigInt');
        case ts.SyntaxKind.VoidKeyword:
        case ts.SyntaxKind.UndefinedKeyword:
        case ts.SyntaxKind.NeverKeyword:
            return ts.factory.createVoidZero();
        case ts.SyntaxKind.ArrayType:
        case ts.SyntaxKind.TupleType:
            return ts.factory.createIdentifier('Array');
        case ts.SyntaxKind.FunctionType:
        case ts.SyntaxKind.ConstructorType:
            return ts.factory.createIdentifier('Function');
        case ts.SyntaxKind.LiteralType: {
            const literal = (type as ts.LiteralTypeNode).literal;
            if (ts.isStringLiteral(literal)) return ts.factory.createIdentifier('String');
            if (ts.isNumericLiteral(literal)) return ts.factory.createIdentifier('Number');
            if (literal.kind === ts.SyntaxKind.TrueKeyword || literal.kind === ts.SyntaxKind.FalseKeyword) {
                return ts.factory.createIdentifier('Boolean');
            }
            return object();
        }
        case ts.SyntaxKind.TypeReference: {
            const name = (type as ts.TypeReferenceNode).typeName;
            if (!isRuntimeValueType(name)) {
                return object();
            }
            if (ts.isIdentifier(name)) {
                return valueTypeReference(name.text);
            }
            return entityNameExpression(name);
        }
        case ts.SyntaxKind.ParenthesizedType:
            return typeExpression((type as ts.ParenthesizedTypeNode).type);
        default:
            return object();
    }
}

function entityNameExpression(name: ts.EntityName): ts.Expression {
    return ts.isIdentifier(name)
        ? ts.factory.createIdentifier(name.text)
        : ts.factory.createPropertyAccessExpression(
            entityNameExpression(name.left),
            name.right.text
        );
}

function parametersMetadata(parameters: readonly ts.ParameterDeclaration[]): ts.Expression {
    return ts.factory.createArrayLiteralExpression(parameters.map(parameter => typeExpression(parameter.type)), false);
}

function adviceDescriptor(decorator: ts.Decorator, member: ts.MethodDeclaration, key: string): ts.Expression {
    const name = decoratorName(decorator);
    const args = decoratorArgs(decorator);
    const properties: ts.ObjectLiteralElementLike[] = [
        ts.factory.createPropertyAssignment('propertyKey', ts.factory.createStringLiteral(key)),
        ts.factory.createPropertyAssignment('adviceName', ts.factory.createStringLiteral(name))
    ];
    const first = args[0];
    if (first) {
        if (ts.isObjectLiteralExpression(first)) {
            properties.push(ts.factory.createSpreadAssignment(first));
        } else {
            properties.push(ts.factory.createPropertyAssignment('pointcut', first));
        }
    }
    if (name === 'AfterReturning' || name === 'AfterThrowing') {
        const valueKey = name === 'AfterReturning' ? 'returning' : 'throwing';
        if (args[1]) {
            properties.push(ts.factory.createPropertyAssignment(valueKey, args[1]));
        }
        if (args[2] && ts.isStringLiteral(args[2])) {
            properties.push(ts.factory.createPropertyAssignment('annotationName', args[2]));
        } else if (args[2] && ts.isObjectLiteralExpression(args[2])) {
            properties.push(ts.factory.createSpreadAssignment(args[2]));
        }
    } else if (args[1] && ts.isStringLiteral(args[1])) {
        properties.push(ts.factory.createPropertyAssignment('annotationArgName', args[1]));
    } else if (args[1] && ts.isObjectLiteralExpression(args[1])) {
        properties.push(ts.factory.createSpreadAssignment(args[1]));
    }
    const params = member.parameters
        .map(parameter => parameter.type)
        .filter((type): type is ts.TypeNode => !!type);
    if (params.length) {
        properties.push(ts.factory.createPropertyAssignment('params', ts.factory.createArrayLiteralExpression(
            params.map(type => ts.factory.createObjectLiteralExpression([
                ts.factory.createPropertyAssignment('type', typeExpression(type))
            ], false)),
            false
        )));
    }
    return ts.factory.createObjectLiteralExpression(properties, true);
}

function aspectOptions(decorator: ts.Decorator | undefined): ts.Expression {
    if (!decorator) {
        return ts.factory.createObjectLiteralExpression([], false);
    }
    const args = decoratorArgs(decorator);
    const first = args[0];
    if (first && ts.isObjectLiteralExpression(first)) {
        return first;
    }
    const props: ts.ObjectLiteralElementLike[] = [];
    if (first) {
        props.push(ts.factory.createPropertyAssignment('annotation', first));
    }
    if (args[1]) {
        props.push(ts.factory.createPropertyAssignment('within', args[1]));
    }
    return ts.factory.createObjectLiteralExpression(props, false);
}

function memberParameters(member: ts.ClassElement): readonly ts.ParameterDeclaration[] {
    return 'parameters' in member && Array.isArray((member as any).parameters)
        ? (member as any).parameters as readonly ts.ParameterDeclaration[]
        : [];
}

function stripDecorators(modifiers: ts.NodeArray<ts.ModifierLike> | undefined): ts.ModifierLike[] | undefined {
    if (!modifiers) {
        return undefined;
    }
    const filtered = modifiers.filter(item => !ts.isDecorator(item));
    return filtered.length ? filtered : undefined;
}

function stripParameterDecorators(parameter: ts.ParameterDeclaration): ts.ParameterDeclaration {
    const modifiers = stripDecorators(parameter.modifiers);
    return !modifiers && !parameter.modifiers
        ? parameter
        : ts.factory.updateParameterDeclaration(parameter, modifiers, parameter.dotDotDotToken, parameter.name, parameter.questionToken, parameter.type, parameter.initializer);
}

function stripMemberDecorators(member: ts.ClassElement): ts.ClassElement {
    const factory = ts.factory;
    const modifiers = stripDecorators((member as any).modifiers);
    if (ts.isConstructorDeclaration(member)) {
        return factory.updateConstructorDeclaration(member, modifiers, member.parameters.map(stripParameterDecorators), member.body);
    }
    if (ts.isMethodDeclaration(member)) {
        return factory.updateMethodDeclaration(member, modifiers, member.asteriskToken, member.name, member.questionToken, member.typeParameters, member.parameters.map(stripParameterDecorators), member.type, member.body);
    }
    if (ts.isPropertyDeclaration(member)) {
        return factory.updatePropertyDeclaration(member, modifiers, member.name, member.questionToken || member.exclamationToken, member.type, member.initializer);
    }
    if (ts.isGetAccessorDeclaration(member)) {
        return factory.updateGetAccessorDeclaration(member, modifiers, member.name, member.parameters.map(stripParameterDecorators), member.type, member.body);
    }
    if (ts.isSetAccessorDeclaration(member)) {
        return factory.updateSetAccessorDeclaration(member, modifiers, member.name, member.parameters.map(stripParameterDecorators), member.body);
    }
    return member;
}

function decoratorsArray(records: DecoratorRecord[]): ts.Expression {
    const factory = ts.factory;
    const kindOf = (record: DecoratorRecord): number => {
        const kind = record.kind === 'class' ? 0 : record.kind === 'property' ? 1 : record.kind === 'method' ? 2 : 3;
        return record.static && record.kind !== 'class' ? kind + 4 : kind;
    };
    // Compact tuple form: [decorator, kind, propertyKey?, parameterIndex?].
    // Property names are omitted to keep generated bundles small.
    return factory.createArrayLiteralExpression(records.map(record => {
        const elements: ts.Expression[] = [
            record.expression,
            factory.createNumericLiteral(kindOf(record))
        ];
        if (record.propertyKey !== undefined) {
            elements.push(factory.createStringLiteral(record.propertyKey));
        } else if (record.parameterIndex !== undefined) {
            elements.push(factory.createIdentifier('undefined'));
        }
        if (record.parameterIndex !== undefined) {
            elements.push(factory.createNumericLiteral(record.parameterIndex));
        }
        return factory.createArrayLiteralExpression(elements, false);
    }), false);
}

function designMetadataCall(className: string, key: string, metadataKey: string, value: ts.Expression, staticMember: boolean): ts.Statement {
    const factory = ts.factory;
    const target = staticMember
        ? factory.createIdentifier(className)
        : factory.createPropertyAccessExpression(factory.createIdentifier(className), 'prototype');
    const call = factory.createCallExpression(
        factory.createPropertyAccessExpression(factory.createIdentifier('Reflect'), 'metadata'),
        undefined,
        [factory.createStringLiteral(metadataKey), value]
    );
    return factory.createExpressionStatement(
        factory.createCallExpression(call, undefined, [target, factory.createStringLiteral(key)])
    );
}

/**
 * TypeScript transformer that turns decorator syntax into one precompiled
 * metadata call per class.
 *
 * - collect class/member/parameter decorator expressions;
 * - remove decorators from the emitted AST;
 * - emit `design:*` metadata explicitly (emitDecoratorMetadata equivalent);
 * - lower AOP decorators to `registerPrecompiledAspect` instead of running
 *   `@Aspect`/`@Before`/... decorator functions.
 */
export function createDecoratorPrecompileTransformer(options: DecoratorPrecompileOptions = {}) {
    const useAop = options.aop !== false;
    const designMetadata = options.designMetadata !== false;
    activeTypeChecker = options.typeChecker;
    return (context: ts.TransformationContext) => {
        const factory = context.factory;
        return (sourceFile: ts.SourceFile): ts.SourceFile => {
            const imports: ts.Statement[] = [];
            const statements: ts.Statement[] = [];
            activeTypeContext = { sourceFile, imports, aliases: new Map(), sequence: { value: 0 } };
            let usesIoc = false;
            let usesAop = false;
            let usesNoPointcut = false;
            let usesReflect = false;

            const transformClass = (node: ts.ClassDeclaration): ClassTransform | undefined => {
                if (!node.name) {
                    return undefined;
                }
                const classDecorators = decoratorsOf(node);
                const hasAnyMemberDecorator = node.members.some(member =>
                    decoratorsOf(member).length > 0 || memberParameters(member).some(parameter => decoratorsOf(parameter).length > 0)
                );
                if (!classDecorators.length && !hasAnyMemberDecorator) {
                    return undefined;
                }
                const records: DecoratorRecord[] = [];
                const aspectDecorator = useAop ? classDecorators.find(item => decoratorName(item) === 'Aspect') : undefined;
                const noPointcutDecorator = useAop ? classDecorators.find(item => decoratorName(item) === 'NonePointcut') : undefined;
                const genericClassDecorators = classDecorators.filter(item => !(useAop && AOP_DECORATORS.has(decoratorName(item))));
                const adviceExpressions: ts.Expression[] = [];
                const metadataStatements: ts.Statement[] = [];

                const members = node.members.map(member => {
                    const memberDecorators = decoratorsOf(member);
                    const key = memberKey(member);
                    const parameters = memberParameters(member);
                    const hasDecorators = memberDecorators.length > 0 || parameters.some(parameter => decoratorsOf(parameter).length > 0);
                    const isStatic = !!((member as any).modifiers as ts.NodeArray<ts.ModifierLike> | undefined)?.some(
                        modifier => modifier.kind === ts.SyntaxKind.StaticKeyword
                    );
                    // TypeScript applies parameter decorators from the last
                    // parameter to the first, and each parameter's decorators
                    // in reverse declaration order.
                    for (let index = parameters.length - 1; index >= 0; index--) {
                        const parameter = parameters[index];
                        decoratorsOf(parameter).slice().reverse().forEach(decorator => {
                            records.push({
                                expression: decorator.expression,
                                kind: 'parameter',
                                propertyKey: key,
                                parameterIndex: index,
                                static: isStatic
                            });
                        });
                    }
                    // TypeScript emits design:paramtypes for decorated methods
                    // (even with no parameters) and for constructors only when
                    // the class or the constructor itself is decorated.
                    const shouldEmitParams = ts.isConstructorDeclaration(member)
                        ? (hasDecorators || classDecorators.length > 0)
                        : hasDecorators;
                    if (designMetadata && shouldEmitParams) {
                        const target = key && key !== 'constructor' && !isStatic
                            ? factory.createPropertyAccessExpression(factory.createIdentifier(node.name!.text), 'prototype')
                            : factory.createIdentifier(node.name!.text);
                        const metadata = factory.createCallExpression(
                            factory.createPropertyAccessExpression(factory.createIdentifier('Reflect'), 'metadata'),
                            undefined,
                            [factory.createStringLiteral('design:paramtypes'), parametersMetadata(parameters)]
                        );
                        metadataStatements.push(factory.createExpressionStatement(
                            factory.createCallExpression(metadata, undefined, key && key !== 'constructor'
                                ? [target, factory.createStringLiteral(key)]
                                : [factory.createIdentifier(node.name!.text)])
                        ));
                    }
                    const genericMemberDecorators = memberDecorators.filter(decorator => {
                        if (!useAop || !AOP_DECORATORS.has(decoratorName(decorator))) {
                            return true;
                        }
                        if (AOP_ADVICES.has(decoratorName(decorator)) && key && ts.isMethodDeclaration(member)) {
                            adviceExpressions.push(adviceDescriptor(decorator, member, key));
                        }
                        return false;
                    });
                    genericMemberDecorators.slice().reverse().forEach(decorator => {
                        records.push({
                            expression: decorator.expression,
                            kind: ts.isMethodDeclaration(member) ? 'method' : 'property',
                            propertyKey: key,
                            static: isStatic
                        });
                    });
                    if (designMetadata && ts.isPropertyDeclaration(member) && memberDecorators.length) {
                        metadataStatements.push(designMetadataCall(
                            node.name!.text,
                            key!,
                            'design:type',
                            typeExpression(member.type),
                            isStatic
                        ));
                    }
                    if (designMetadata && (ts.isMethodDeclaration(member) || ts.isGetAccessorDeclaration(member)) && hasDecorators) {
                        metadataStatements.push(designMetadataCall(
                            node.name!.text,
                            key!,
                            'design:returntype',
                            typeExpression((member as ts.MethodDeclaration).type),
                            isStatic
                        ));
                    }
                    return stripMemberDecorators(member);
                });

                genericClassDecorators.slice().reverse().forEach(decorator => {
                    records.push({ expression: decorator.expression, kind: 'class' });
                });

                const updated = factory.updateClassDeclaration(
                    node,
                    stripDecorators(node.modifiers),
                    node.name,
                    node.typeParameters,
                    node.heritageClauses,
                    members
                );
                const injections: ts.Statement[] = [...metadataStatements];
                if (records.length) {
                    injections.push(factory.createExpressionStatement(factory.createCallExpression(
                        factory.createIdentifier('__tsdi_applyDecorators'),
                        undefined,
                        [factory.createIdentifier(node.name!.text), decoratorsArray(records)]
                    )));
                    usesIoc = true;
                }
                if (aspectDecorator) {
                    injections.push(factory.createExpressionStatement(factory.createCallExpression(
                        factory.createIdentifier('__tsdi_registerAspect'),
                        undefined,
                        [factory.createIdentifier(node.name!.text), factory.createObjectLiteralExpression([
                            factory.createSpreadAssignment(aspectOptions(aspectDecorator)),
                            factory.createPropertyAssignment('advices', factory.createArrayLiteralExpression(adviceExpressions, false))
                        ], false)]
                    )));
                    usesAop = true;
                }
                if (noPointcutDecorator) {
                    injections.push(factory.createExpressionStatement(factory.createCallExpression(
                        factory.createIdentifier('__tsdi_noPointcut'),
                        undefined,
                        [factory.createIdentifier(node.name!.text)]
                    )));
                    usesNoPointcut = true;
                }
                usesReflect = usesReflect || metadataStatements.length > 0;
                return { node: updated, injections };
            };

            for (const statement of sourceFile.statements) {
                if (ts.isClassDeclaration(statement)) {
                    const result = transformClass(statement);
                    if (result) {
                        statements.push(result.node, ...result.injections);
                        continue;
                    }
                }
                statements.push(statement);
            }

            if (usesReflect) {
                imports.push(factory.createImportDeclaration(undefined, undefined, factory.createStringLiteral('reflect-metadata'), undefined));
            }
            if (usesIoc) {
                imports.push(factory.createImportDeclaration(
                    undefined,
                    factory.createImportClause(false, undefined, factory.createNamedImports([
                        factory.createImportSpecifier(false, factory.createIdentifier('applyPrecompiledDecorators'), factory.createIdentifier('__tsdi_applyDecorators'))
                    ])),
                    factory.createStringLiteral('@tsdi/ioc'),
                    undefined
                ));
            }
            if (usesAop || usesNoPointcut) {
                const specifiers: ts.ImportSpecifier[] = [];
                if (usesAop) {
                    specifiers.push(factory.createImportSpecifier(false, factory.createIdentifier('registerPrecompiledAspect'), factory.createIdentifier('__tsdi_registerAspect')));
                }
                if (usesNoPointcut) {
                    specifiers.push(factory.createImportSpecifier(false, factory.createIdentifier('registerPrecompiledNoPointcut'), factory.createIdentifier('__tsdi_noPointcut')));
                }
                imports.push(factory.createImportDeclaration(
                    undefined,
                    factory.createImportClause(false, undefined, factory.createNamedImports(specifiers)),
                    factory.createStringLiteral('@tsdi/aop'),
                    undefined
                ));
            }
            return factory.updateSourceFile(sourceFile, [...imports, ...statements]);
        };
    };
}
