import * as ts from 'typescript';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { templateToIR } from './template-ir';

const ASPECT_DECORATORS = new Set([
    'Aspect', 'Pointcut', 'Before', 'After', 'Around', 'AfterReturning',
    'AfterThrowing', 'Advice', 'NonePointcut'
]);
const ASPECT_ADVICES = new Set(['Pointcut', 'Before', 'After', 'Around', 'AfterReturning', 'AfterThrowing', 'Advice']);

/**
 * Class-level decorators whose metadata can be materialized without running
 * the decorator factory/dispatch pipeline. Classes that also carry member or
 * parameter decorators keep the runtime path, because those still need the
 * full design/runtime handler chain.
 */
const PRECOMPILABLE_CLASS_DECORATORS = new Set([
    'Injectable', 'Singleton', 'Static', 'Abstract', 'Providers', 'Autorun', 'ProvidedIn', 'Pipe', 'NoReactive', 'Component', 'Directive'
]);

/** Member decorators whose metadata can be materialized statically. */
const PRECOMPILABLE_MEMBER_DECORATORS = new Set([
    'Attribute', 'Computed', 'ViewChild', 'ViewChildren', 'ContentChild', 'ContentChildren', 'NoReactive'
]);


export interface AotPrecompileOptions {
    /** Emit design:* metadata (needed by IoC injection). Default true. */
    designMetadata?: boolean;
    /** Used to emit Object for interfaces/type-only aliases in design metadata. */
    typeChecker?: ts.TypeChecker;
    /**
     * Module kind of the current emit. CommonJS emit leaves synthetic import
     * aliases unresolved, so the generated helper bindings use `require()` for
     * CJS and real imports for ESM.
     */
    moduleKind?: ts.ModuleKind;
}

/** @deprecated Use {@link AotPrecompileOptions}. */
export type DecoratorPrecompileOptions = AotPrecompileOptions;

let activeTypeChecker: ts.TypeChecker | undefined;
interface TypeEmitContext {
    sourceFile: ts.SourceFile;
    imports: ts.Statement[];
    aliases: Map<string, string>;
    sequence: { value: number };
    moduleKind?: ts.ModuleKind;
    usesInjectFlags?: boolean;
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
    if (context.moduleKind === ts.ModuleKind.CommonJS) {
        // CommonJS emit has no local binding for a named import, and synthetic
        // metadata identifiers are not linked to the original import symbol.
        // Bind the module namespace with a real require and qualify the access.
        const key = `ns:${imported.module}`;
        let alias = context.aliases.get(key);
        if (!alias) {
            alias = `__tsdi_ns_${context.sequence.value++}`;
            context.aliases.set(key, alias);
            context.imports.push(ts.factory.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
                ts.factory.createVariableDeclaration(
                    alias,
                    undefined,
                    undefined,
                    ts.factory.createCallExpression(ts.factory.createIdentifier('require'), undefined, [ts.factory.createStringLiteral(imported.module)])
                )
            ], ts.NodeFlags.Const)));
        }
        return ts.factory.createPropertyAccessExpression(
            ts.factory.createIdentifier(alias),
            imported.imported === 'default' ? 'default' : imported.imported
        );
    }
    // Always create a value alias for metadata references. The original import
    // may be erased by TypeScript's import elision when the class is only used
    // in type position; the synthetic metadata still needs a runtime binding.
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
            ts.factory.createStringLiteral(imported.module)
        )
        : ts.factory.createImportDeclaration(
            undefined,
            ts.factory.createImportClause(false, undefined, ts.factory.createNamedImports([
                ts.factory.createImportSpecifier(false, ts.factory.createIdentifier(imported.imported), ts.factory.createIdentifier(alias))
            ])),
            ts.factory.createStringLiteral(imported.module)
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

function isObjectLiteralExpression(node: ts.Expression | undefined): node is ts.ObjectLiteralExpression {
    return !!node && ts.isObjectLiteralExpression(node);
}

/**
 * Emit the metadata object a decorator's `props`/`appendProps` would produce
 * for the shapes the framework documents. Returns `undefined` when the call is
 * dynamic enough that only the real decorator can be trusted.
 */
function precompiledDecoratorMetadata(decorator: ts.Decorator): ts.Expression | undefined {
    const factory = ts.factory;
    const name = decoratorName(decorator);
    if (!ts.isCallExpression(decorator.expression)) {
        return undefined;
    }
    const args = decoratorArgs(decorator);
    switch (name) {
        case 'Injectable':
            if (args.length === 0) return factory.createObjectLiteralExpression([], false);
            if (args.length === 1) {
                return isObjectLiteralExpression(args[0])
                    ? args[0]
                    : factory.createObjectLiteralExpression([
                        factory.createPropertyAssignment('provide', args[0])
                    ], false);
            }
            return undefined;
        case 'Singleton':
            return args.length === 0
                ? factory.createObjectLiteralExpression([factory.createPropertyAssignment('singleton', factory.createTrue())], false)
                : undefined;
        case 'Static':
            return args.length === 0
                ? factory.createObjectLiteralExpression([factory.createPropertyAssignment('static', factory.createTrue())], false)
                : undefined;
        case 'Abstract':
            return args.length === 0
                ? factory.createObjectLiteralExpression([factory.createPropertyAssignment('abstract', factory.createTrue())], false)
                : undefined;
        case 'Providers':
            return args.length === 1
                ? factory.createObjectLiteralExpression([factory.createPropertyAssignment('providers', args[0])], false)
                : undefined;
        case 'NoReactive':
            return factory.createObjectLiteralExpression([], false);
        case 'Pipe':
            if (args.length === 1 && ts.isStringLiteral(args[0])) {
                return factory.createObjectLiteralExpression([
                    factory.createPropertyAssignment('selector', args[0]),
                    factory.createPropertyAssignment('provide', args[0]),
                    factory.createPropertyAssignment('pure', factory.createTrue())
                ], false);
            }
            if (args.length === 2 && ts.isStringLiteral(args[0])) {
                return factory.createObjectLiteralExpression([
                    factory.createPropertyAssignment('selector', args[0]),
                    factory.createPropertyAssignment('provide', args[0]),
                    factory.createPropertyAssignment('pure', args[1])
                ], false);
            }
            return undefined;
        case 'ProvidedIn':
            if (args.length === 1 && ts.isObjectLiteralExpression(args[0])) {
                return args[0];
            }
            if (args.length === 1) {
                return factory.createObjectLiteralExpression([
                    factory.createPropertyAssignment('target', selectorValueExpression(args[0]))
                ], false);
            }
            if (args.length === 2) {
                return factory.createObjectLiteralExpression([
                    factory.createPropertyAssignment('target', selectorValueExpression(args[0])),
                    factory.createPropertyAssignment('provide', selectorValueExpression(args[1]))
                ], false);
            }
            return undefined;
        case 'Autorun': {
            const base = [
                factory.createPropertyAssignment('auto', factory.createTrue()),
                factory.createPropertyAssignment('singleton', factory.createTrue())
            ];
            if (args.length === 0) {
                return factory.createObjectLiteralExpression(base, false);
            }
            if (args.length === 1 && ts.isObjectLiteralExpression(args[0])) {
                return factory.updateObjectLiteralExpression(args[0], [
                    ...args[0].properties,
                    ...base
                ]);
            }
            if (args.length <= 2 && (ts.isStringLiteral(args[0]) || ts.isNumericLiteral(args[0]))) {
                const properties: ts.ObjectLiteralElementLike[] = [
                    factory.createPropertyAssignment(
                        ts.isStringLiteral(args[0]) ? 'propertyKey' : 'order',
                        args[0]
                    ),
                    ...base
                ];
                if (args[1]) {
                    properties.splice(1, 0, factory.createPropertyAssignment('args', args[1]));
                }
                return factory.createObjectLiteralExpression(properties, false);
            }
            return undefined;
        }
        case 'Component':
        case 'Directive':
            return args.length === 1 && isObjectLiteralExpression(args[0])
                ? args[0]
                : undefined;
        default:
            return undefined;
    }
}

function propertyName(property: ts.ObjectLiteralElementLike): string | undefined {
    if (!ts.isPropertyAssignment(property)) {
        return undefined;
    }
    const name = property.name;
    return ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)
        ? name.text
        : undefined;
}

function inlineTemplateText(metadata: ts.ObjectLiteralExpression): string | undefined {
    const template = metadata.properties.find(property =>
        propertyName(property) === 'template'
    ) as ts.PropertyAssignment | undefined;
    if (template && ts.isStringLiteral(template.initializer)) {
        return template.initializer.text;
    }
    const templateUrl = metadata.properties.find(property =>
        propertyName(property) === 'templateUrl'
    ) as ts.PropertyAssignment | undefined;
    if (!templateUrl || !ts.isStringLiteral(templateUrl.initializer) || !activeTypeContext?.sourceFile) {
        return undefined;
    }
    try {
        return readFileSync(resolve(dirname(activeTypeContext.sourceFile.fileName), templateUrl.initializer.text), 'utf-8');
    } catch {
        return undefined;
    }
}

function attachTemplateIR(metadata: ts.Expression): ts.Expression {
    if (!ts.isObjectLiteralExpression(metadata)) {
        return metadata;
    }
    const templateText = inlineTemplateText(metadata);
    if (!templateText) {
        return metadata;
    }
    const ir = templateToIR(templateText);
    if (!ir) {
        return metadata;
    }
    const properties = metadata.properties.filter(property => propertyName(property) !== 'templateIR');
    properties.push(ts.factory.createPropertyAssignment(
        'templateIR',
        ts.factory.createStringLiteral(JSON.stringify(ir))
    ));
    return ts.factory.updateObjectLiteralExpression(metadata, properties);
}

function withProperty(expression: ts.Expression, key: string, value: ts.Expression): ts.Expression {
    if (!ts.isObjectLiteralExpression(expression)) {
        return ts.factory.createObjectLiteralExpression([
            ts.factory.createPropertyAssignment(key, value)
        ], false);
    }
    const properties = expression.properties.filter(property => propertyName(property) !== key);
    properties.push(ts.factory.createPropertyAssignment(key, value));
    return ts.factory.updateObjectLiteralExpression(expression, properties);
}

function selectorValueExpression(expression: ts.Expression): ts.Expression {
    if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
        return expression;
    }
    if (ts.isIdentifier(expression)) {
        return valueTypeReference(expression.text);
    }
    return expression;
}

function queryMetadataExpression(decorator: ts.Decorator): ts.Expression | undefined {
    const factory = ts.factory;
    const args = decoratorArgs(decorator);
    if (args.length === 0) {
        return factory.createObjectLiteralExpression([
            factory.createPropertyAssignment('nullable', factory.createTrue())
        ], false);
    }
    if (args.length === 1 && ts.isObjectLiteralExpression(args[0])) {
        const properties = args[0].properties.map(property => {
            if (!ts.isPropertyAssignment(property)) {
                return property;
            }
            const name = propertyName(property);
            return name === 'selector' || name === 'read'
                ? factory.createPropertyAssignment(property.name, selectorValueExpression(property.initializer))
                : property;
        });
        return factory.updateObjectLiteralExpression(args[0], properties);
    }
    if (args.length <= 2 && (ts.isStringLiteral(args[0]) || ts.isIdentifier(args[0]))) {
        const properties: ts.ObjectLiteralElementLike[] = [
            factory.createPropertyAssignment('selector', selectorValueExpression(args[0]))
        ];
        if (args[1]) {
            properties.push(factory.createPropertyAssignment('read', selectorValueExpression(args[1])));
        }
        properties.push(factory.createPropertyAssignment('nullable', factory.createTrue()));
        return factory.createObjectLiteralExpression(properties, false);
    }
    return undefined;
}

function injectedPropertyMetadata(decorator: ts.Decorator, member: ts.ClassElement): ts.Expression | undefined {
    const factory = ts.factory;
    const args = decoratorArgs(decorator);
    if (args[0]) {
        return factory.createObjectLiteralExpression([
            factory.createPropertyAssignment('provider', selectorValueExpression(args[0]))
        ], false);
    }
    if (!activeTypeChecker) {
        return undefined;
    }
    const type = (member as ts.PropertyDeclaration).type;
    if (!type || !ts.isTypeReferenceNode(type)) {
        return undefined;
    }
    let symbol = activeTypeChecker.getSymbolAtLocation(type.typeName);
    if (symbol && (symbol.flags & ts.SymbolFlags.Alias)) {
        symbol = activeTypeChecker.getAliasedSymbol(symbol);
    }
    if (!symbol || !(symbol.flags & ts.SymbolFlags.Class)) {
        return undefined;
    }
    return factory.createObjectLiteralExpression([
        factory.createPropertyAssignment('type', typeExpression(type))
    ], false);
}

function attachMethodMetadata(metadata: ts.Expression, node: ts.ClassDeclaration): ts.Expression {
    const entries: ts.Expression[] = [];
    for (const member of node.members) {
        if (ts.isConstructorDeclaration(member)) {
            continue;
        }
        const key = memberKey(member);
        if (!key) {
            continue;
        }
        const parameters = memberParameters(member);
        if (!parameters.some(parameter => decoratorsOf(parameter).length)) {
            continue;
        }
        const params: ts.Expression[] = [];
        for (const parameter of parameters) {
            const dep = parameterDependency(parameter);
            if (!dep) {
                return metadata;
            }
            params.push(dep);
        }
        entries.push(ts.factory.createArrayLiteralExpression([
            ts.factory.createStringLiteral(key),
            ts.factory.createObjectLiteralExpression([
                ts.factory.createPropertyAssignment('params', ts.factory.createArrayLiteralExpression(params, false))
            ], false)
        ], false));
    }
    if (!entries.length) {
        return metadata;
    }
    return withProperty(metadata, 'methodMetadatas', ts.factory.createArrayLiteralExpression(entries, false));
}

function methodAutorunMetadata(decorator: ts.Decorator, key: string): ts.Expression | undefined {
    const factory = ts.factory;
    const args = decoratorArgs(decorator);
    const properties: ts.ObjectLiteralElementLike[] = [
        factory.createPropertyAssignment('propertyKey', factory.createStringLiteral(key)),
        factory.createPropertyAssignment('decorType', factory.createStringLiteral('method')),
        factory.createPropertyAssignment('auto', factory.createTrue())
    ];
    if (args.length === 0) {
        return factory.createObjectLiteralExpression(properties, false);
    }
    if (args.length === 1 && ts.isObjectLiteralExpression(args[0])) {
        return factory.updateObjectLiteralExpression(args[0], [
            ...args[0].properties,
            ...properties
        ]);
    }
    if (args.length <= 2 && ts.isNumericLiteral(args[0])) {
        properties.splice(1, 0, factory.createPropertyAssignment('order', args[0]));
        if (args[1]) {
            properties.splice(2, 0, factory.createPropertyAssignment('args', args[1]));
        }
        return factory.createObjectLiteralExpression(properties, false);
    }
    return undefined;
}

function attachServiceMembers(metadata: ts.Expression, node: ts.ClassDeclaration): ts.Expression {
    const properties: ts.Expression[] = [];
    const runnables: ts.Expression[] = [];
    for (const member of node.members) {
        if (ts.isConstructorDeclaration(member)) {
            continue;
        }
        const key = memberKey(member);
        if (!key) {
            continue;
        }
        for (const decorator of decoratorsOf(member)) {
            const name = decoratorName(decorator);
            if (name === 'Autowired' || name === 'Inject') {
                const meta = injectedPropertyMetadata(decorator, member);
                if (!meta) {
                    continue;
                }
                const withKey = withProperty(meta, 'propertyKey', ts.factory.createStringLiteral(key));
                properties.push(ts.factory.createArrayLiteralExpression([
                    ts.factory.createStringLiteral(key),
                    withKey
                ], false));
            } else if (name === 'Autorun' && !ts.isPropertyDeclaration(member)) {
                const meta = methodAutorunMetadata(decorator, key);
                if (meta) {
                    runnables.push(meta);
                }
            }
        }
    }
    let result = metadata;
    if (properties.length) {
        result = withProperty(result, 'propMetadatas', ts.factory.createArrayLiteralExpression(properties, false));
    }
    if (runnables.length) {
        result = withProperty(result, 'runnables', ts.factory.createArrayLiteralExpression(runnables, false));
    }
    return result;
}

function memberMetadataExpression(decorator: ts.Decorator): ts.Expression | undefined {
    const factory = ts.factory;
    const name = decoratorName(decorator);
    const args = decoratorArgs(decorator);
    switch (name) {
        case 'NoReactive':
            return factory.createObjectLiteralExpression([], false);
        case 'ViewChild':
        case 'ViewChildren':
        case 'ContentChild':
        case 'ContentChildren':
            return queryMetadataExpression(decorator);
        case 'Attribute':
            if (args.length === 0) {
                return factory.createObjectLiteralExpression([
                    factory.createPropertyAssignment('nullable', factory.createTrue())
                ], false);
            }
            if (args.length === 1 && ts.isStringLiteral(args[0])) {
                return factory.createObjectLiteralExpression([
                    factory.createPropertyAssignment('alias', args[0]),
                    factory.createPropertyAssignment('nullable', factory.createTrue())
                ], false);
            }
            if (args.length === 2 && ts.isStringLiteral(args[0])) {
                return factory.createObjectLiteralExpression([
                    factory.createPropertyAssignment('alias', args[0]),
                    factory.createPropertyAssignment('required', args[1]),
                    factory.createPropertyAssignment('nullable', factory.createTrue())
                ], false);
            }
            if (args.length === 1 && ts.isObjectLiteralExpression(args[0])) {
                return args[0];
            }
            return undefined;
        case 'Computed':
            if (args.length === 0) {
                return factory.createObjectLiteralExpression([
                    factory.createPropertyAssignment('cache', factory.createTrue())
                ], false);
            }
            if (args.length === 1 && ts.isArrayLiteralExpression(args[0])) {
                return factory.createObjectLiteralExpression([
                    factory.createPropertyAssignment('dependencies', args[0]),
                    factory.createPropertyAssignment('cache', factory.createTrue())
                ], false);
            }
            if (args.length === 2 && ts.isArrayLiteralExpression(args[0])) {
                return factory.createObjectLiteralExpression([
                    factory.createPropertyAssignment('dependencies', args[0]),
                    factory.createPropertyAssignment('cache', args[1])
                ], false);
            }
            if (args.length === 1 && ts.isObjectLiteralExpression(args[0])) {
                return args[0];
            }
            return undefined;
        default:
            return undefined;
    }
}

function attachNoReactiveMetadata(metadata: ts.Expression, node: ts.ClassDeclaration): ts.Expression {
    const members: ts.Expression[] = [];
    let classLevel = false;
    for (const decorator of decoratorsOf(node)) {
        if (decoratorName(decorator) === 'NoReactive') {
            classLevel = true;
        }
    }
    for (const member of node.members) {
        const key = memberKey(member);
        if (!key) {
            continue;
        }
        for (const decorator of decoratorsOf(member)) {
            if (decoratorName(decorator) === 'NoReactive') {
                members.push(ts.factory.createStringLiteral(key));
            }
        }
    }
    let result = metadata;
    if (classLevel) {
        result = withProperty(result, 'noReactiveClass', ts.factory.createTrue());
    }
    if (members.length) {
        result = withProperty(result, 'noReactive', ts.factory.createArrayLiteralExpression(members, false));
    }
    return result;
}

function attachMemberMetadata(metadata: ts.Expression, node: ts.ClassDeclaration): ts.Expression {
    const attributes: ts.Expression[] = [];
    const computeds: ts.Expression[] = [];
    const viewChilds: ts.Expression[] = [];
    const viewChildrens: ts.Expression[] = [];
    const contentChilds: ts.Expression[] = [];
    const contentChildrens: ts.Expression[] = [];
    for (const member of node.members) {
        const key = memberKey(member);
        if (!key) {
            continue;
        }
        for (const decorator of decoratorsOf(member)) {
            const name = decoratorName(decorator);
            if (!PRECOMPILABLE_MEMBER_DECORATORS.has(name)) {
                continue;
            }
            const meta = memberMetadataExpression(decorator);
            if (!meta) {
                continue;
            }
            const withKey = withProperty(meta, 'propertyKey', ts.factory.createStringLiteral(key));
            switch (name) {
                case 'Attribute': attributes.push(withKey); break;
                case 'Computed': computeds.push(withKey); break;
                case 'ViewChild': viewChilds.push(withKey); break;
                case 'ViewChildren': viewChildrens.push(withKey); break;
                case 'ContentChild': contentChilds.push(withKey); break;
                case 'ContentChildren': contentChildrens.push(withKey); break;
            }
        }
    }
    let result = metadata;
    const addArray = (key: string, values: ts.Expression[]) => {
        if (values.length) {
            result = withProperty(result, key, ts.factory.createArrayLiteralExpression(values, false));
        }
    };
    addArray('attributes', attributes);
    addArray('computeds', computeds);
    addArray('viewChilds', viewChilds);
    addArray('viewChildrens', viewChildrens);
    addArray('contentChilds', contentChilds);
    addArray('contentChildrens', contentChildrens);
    return result;
}

function memberDecoratorsSupported(node: ts.ClassDeclaration): boolean {
    for (const member of node.members) {
        for (const decorator of decoratorsOf(member)) {
            if (!PRECOMPILABLE_MEMBER_DECORATORS.has(decoratorName(decorator))
                || !memberMetadataExpression(decorator)) {
                return false;
            }
        }
        const parameters = memberParameters(member);
        const hasParameterDecorators = parameters.some(parameter => decoratorsOf(parameter).length > 0);
        for (const parameter of parameters) {
            const decorators = decoratorsOf(parameter);
            for (const decorator of decorators) {
                const name = decoratorName(decorator);
                if (name !== 'Inject' && name !== 'Autowired'
                    && name !== 'Optional' && name !== 'Self' && name !== 'SkipSelf' && name !== 'Host') {
                    return false;
                }
            }
            if ((decorators.length || hasParameterDecorators) && !parameterDependency(parameter)) {
                return false;
            }
        }
    }
    return true;
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

/**
 * Emit constructor injection dependencies (`ƿprov`) when every parameter is a
 * concrete class. Interfaces/type aliases and unresolved types fall back to the
 * runtime `design:paramtypes` path instead of injecting `Object`.
 */
function parameterDependency(parameter: ts.ParameterDeclaration): ts.Expression | undefined {
    let token: ts.Expression | undefined;
    const flags: ts.Expression[] = [];
    for (const decorator of decoratorsOf(parameter)) {
        const name = decoratorName(decorator);
        if (name === 'Inject' || name === 'Autowired') {
            const args = decoratorArgs(decorator);
            if (args[0]) {
                token = selectorValueExpression(args[0]);
            }
            continue;
        }
        if (name === 'Optional' || name === 'Self' || name === 'SkipSelf' || name === 'Host') {
            if (activeTypeContext) {
                activeTypeContext.usesInjectFlags = true;
            }
            flags.push(ts.factory.createPropertyAccessExpression(
                ts.factory.createIdentifier('__aotFlags'),
                name
            ));
            continue;
        }
        return undefined;
    }
    if (!token) {
        const type = parameter.type;
        if (!type || !ts.isTypeReferenceNode(type) || !activeTypeChecker) {
            return undefined;
        }
        let symbol = activeTypeChecker.getSymbolAtLocation(type.typeName);
        if (symbol && (symbol.flags & ts.SymbolFlags.Alias)) {
            symbol = activeTypeChecker.getAliasedSymbol(symbol);
        }
        if (!symbol || !(symbol.flags & ts.SymbolFlags.Class)) {
            return undefined;
        }
        token = typeExpression(type);
    }
    if (!token) {
        return undefined;
    }
    return flags.length
        ? ts.factory.createArrayLiteralExpression([token, ...flags], false)
        : token;
}

function constructorDependencies(node: ts.ClassDeclaration): ts.Expression | undefined {
    const ctor = node.members.find(ts.isConstructorDeclaration) as ts.ConstructorDeclaration | undefined;
    if (!ctor?.parameters.length) {
        return undefined;
    }
    const deps: ts.Expression[] = [];
    for (const parameter of ctor.parameters) {
        const dep = parameterDependency(parameter);
        if (!dep) {
            return undefined;
        }
        deps.push(dep);
    }
    return ts.factory.createArrayLiteralExpression(deps, false);
}

function serviceMemberDecoratorsSupported(node: ts.ClassDeclaration): boolean {
    for (const member of node.members) {
        if (ts.isConstructorDeclaration(member)) {
            for (const parameter of member.parameters) {
                const decorators = decoratorsOf(parameter);
                if (!decorators.length) {
                    continue;
                }
                for (const decorator of decorators) {
                    const name = decoratorName(decorator);
                    if (name !== 'Inject' && name !== 'Autowired'
                        && name !== 'Optional' && name !== 'Self' && name !== 'SkipSelf' && name !== 'Host') {
                        return false;
                    }
                }
                // Bare @Inject() needs design:type; only allow it when the plan
                // can be materialized (type checker + concrete class).
                if (!parameterDependency(parameter)) {
                    return false;
                }
            }
            continue;
        }
        for (const decorator of decoratorsOf(member)) {
            const name = decoratorName(decorator);
            if (name === 'NoReactive') {
                continue;
            }
            if (name === 'Autorun') {
                if (ts.isPropertyDeclaration(member) || !methodAutorunMetadata(decorator, memberKey(member) || '')) {
                    return false;
                }
                continue;
            }
            if (name !== 'Autowired' && name !== 'Inject') {
                return false;
            }
            if (!injectedPropertyMetadata(decorator, member)) {
                return false;
            }
        }
        const parameters = memberParameters(member);
        const hasParameterDecorators = parameters.some(parameter => decoratorsOf(parameter).length > 0);
        for (const parameter of parameters) {
            const decorators = decoratorsOf(parameter);
            for (const decorator of decorators) {
                const name = decoratorName(decorator);
                if (name !== 'Inject' && name !== 'Autowired'
                    && name !== 'Optional' && name !== 'Self' && name !== 'SkipSelf' && name !== 'Host') {
                    return false;
                }
            }
            if ((decorators.length || hasParameterDecorators) && !parameterDependency(parameter)) {
                return false;
            }
        }
    }
    return true;
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
 * AOT transformer that turns decorator syntax into one precompiled metadata
 * call per class.
 *
 * - collect class/member/parameter decorator expressions;
 * - remove decorators from the emitted AST;
 * - emit `design:*` metadata explicitly (emitDecoratorMetadata equivalent);
 * - lower aspect decorators to `registerPrecompiledAspect` instead of running
 *   `@Aspect`/`@Before`/... decorator functions.
 */
export function createAotTransformer(options: AotPrecompileOptions = {}) {
    const designMetadata = options.designMetadata !== false;
    activeTypeChecker = options.typeChecker;
    return (context: ts.TransformationContext) => {
        const factory = context.factory;
        return (sourceFile: ts.SourceFile): ts.SourceFile => {
            const imports: ts.Statement[] = [];
            const statements: ts.Statement[] = [];
            activeTypeContext = { sourceFile, imports, aliases: new Map(), sequence: { value: 0 }, moduleKind: options.moduleKind };
            let usesIoc = false;
            let usesAotType = false;
            let usesAotComponent = false;
            let usesAotDirective = false;
            let usesAspect = false;
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
                const aspectDecorator = classDecorators.find(item => decoratorName(item) === 'Aspect');
                const noPointcutDecorator = classDecorators.find(item => decoratorName(item) === 'NonePointcut');
                const genericClassDecorators = classDecorators.filter(item => !ASPECT_DECORATORS.has(decoratorName(item)));
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
                        : (ts.isMethodDeclaration(member)
                            || ts.isGetAccessorDeclaration(member)
                            || ts.isSetAccessorDeclaration(member)) && hasDecorators;
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
                        if (!ASPECT_DECORATORS.has(decoratorName(decorator))) {
                            return true;
                        }
                        if (ASPECT_ADVICES.has(decoratorName(decorator)) && key && ts.isMethodDeclaration(member)) {
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

                let compiledTypeRecords: ts.Expression[] | undefined;
                let precompiledHelper = '__aotType';
                let precompiledMetadata: ts.Expression | undefined;
                const componentLike = genericClassDecorators.some(decorator => {
                    const name = decoratorName(decorator);
                    return name === 'Component' || name === 'Directive';
                });
                if ((componentLike ? memberDecoratorsSupported(node) : serviceMemberDecoratorsSupported(node))
                    && !aspectDecorator
                    && !noPointcutDecorator
                    && genericClassDecorators.length > 0
                    && genericClassDecorators.every(decorator => PRECOMPILABLE_CLASS_DECORATORS.has(decoratorName(decorator)))
                    && genericClassDecorators.every(decorator => !!precompiledDecoratorMetadata(decorator))) {
                    const names = genericClassDecorators.map(decorator => decoratorName(decorator));
                    const hasComponent = names.includes('Component');
                    const hasDirective = names.includes('Directive');
                    if (!(hasComponent && hasDirective)) {
                        precompiledHelper = hasComponent ? '__aotComponent' : hasDirective ? '__aotDirective' : '__aotType';
                        if (hasComponent || hasDirective) {
                            precompiledMetadata = precompiledDecoratorMetadata(
                                genericClassDecorators.find(decorator => decoratorName(decorator) === (hasComponent ? 'Component' : 'Directive'))!
                            );
                            if (hasComponent && precompiledMetadata) {
                                precompiledMetadata = attachTemplateIR(precompiledMetadata);
                            }
                            if (precompiledMetadata) {
                                precompiledMetadata = attachMemberMetadata(precompiledMetadata, node);
                                precompiledMetadata = attachNoReactiveMetadata(precompiledMetadata, node);
                            }
                        } else {
                            precompiledMetadata = factory.createObjectLiteralExpression([
                                factory.createPropertyAssignment('name', factory.createStringLiteral(node.name!.text))
                            ], false);
                            precompiledMetadata = attachServiceMembers(precompiledMetadata, node);
                            precompiledMetadata = attachMethodMetadata(precompiledMetadata, node);
                            precompiledMetadata = attachNoReactiveMetadata(precompiledMetadata, node);
                        }
                        compiledTypeRecords = genericClassDecorators.slice().reverse().map(decorator =>
                            factory.createArrayLiteralExpression([
                                (decorator.expression as ts.CallExpression).expression,
                                precompiledDecoratorMetadata(decorator)!
                            ], false)
                        );
                    }
                }

                const updated = factory.updateClassDeclaration(
                    node,
                    stripDecorators(node.modifiers),
                    node.name,
                    node.typeParameters,
                    node.heritageClauses,
                    members
                );
                const injections: ts.Statement[] = [...metadataStatements];
                if (compiledTypeRecords) {
                    injections.push(factory.createExpressionStatement(factory.createCallExpression(
                        factory.createIdentifier(precompiledHelper),
                        undefined,
                        [
                            factory.createIdentifier(node.name!.text),
                            precompiledMetadata ?? factory.createObjectLiteralExpression([
                                factory.createPropertyAssignment('name', factory.createStringLiteral(node.name!.text))
                            ], false),
                            factory.createArrayLiteralExpression(compiledTypeRecords, false)
                        ]
                    )));
                    if (precompiledHelper === '__aotComponent') {
                        usesAotComponent = true;
                    } else if (precompiledHelper === '__aotDirective') {
                        usesAotDirective = true;
                    } else {
                        usesAotType = true;
                        const deps = constructorDependencies(node);
                        if (deps) {
                            injections.push(factory.createExpressionStatement(factory.createBinaryExpression(
                                factory.createPropertyAccessExpression(factory.createIdentifier(node.name!.text), 'ƿprov'),
                                ts.SyntaxKind.EqualsToken,
                                factory.createObjectLiteralExpression([
                                    factory.createPropertyAssignment('deps', deps)
                                ], false)
                            )));
                        }
                    }
                } else if (records.length) {
                    injections.push(factory.createExpressionStatement(factory.createCallExpression(
                        factory.createIdentifier('__aotDeco'),
                        undefined,
                        [factory.createIdentifier(node.name!.text), decoratorsArray(records)]
                    )));
                    usesIoc = true;
                }
                if (aspectDecorator) {
                    injections.push(factory.createExpressionStatement(factory.createCallExpression(
                        factory.createIdentifier('__aotAspect'),
                        undefined,
                        [factory.createIdentifier(node.name!.text), factory.createObjectLiteralExpression([
                            factory.createSpreadAssignment(aspectOptions(aspectDecorator)),
                            factory.createPropertyAssignment('advices', factory.createArrayLiteralExpression(adviceExpressions, false))
                        ], false)]
                    )));
                    usesAspect = true;
                }
                if (noPointcutDecorator) {
                    injections.push(factory.createExpressionStatement(factory.createCallExpression(
                        factory.createIdentifier('__aotNoPointcut'),
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
                imports.push(factory.createImportDeclaration(undefined, undefined, factory.createStringLiteral('reflect-metadata')));
            }
            if (activeTypeContext?.usesInjectFlags) {
                // `addHelperBinding` is declared below; inline the same shape.
                if (options.moduleKind === ts.ModuleKind.CommonJS) {
                    imports.push(factory.createVariableStatement(undefined, factory.createVariableDeclarationList([
                        factory.createVariableDeclaration('__aotFlags', undefined, undefined,
                            factory.createPropertyAccessExpression(
                                factory.createCallExpression(factory.createIdentifier('require'), undefined, [factory.createStringLiteral('@tsdi/ioc')]),
                                'InjectFlags'
                            ))
                    ], ts.NodeFlags.Const)));
                } else {
                    imports.push(factory.createImportDeclaration(
                        undefined,
                        factory.createImportClause(false, undefined, factory.createNamedImports([
                            factory.createImportSpecifier(false, factory.createIdentifier('InjectFlags'), factory.createIdentifier('__aotFlags'))
                        ])),
                        factory.createStringLiteral('@tsdi/ioc')
                    ));
                }
            }
            const addHelperBinding = (local: string, moduleName: string, exported: string): void => {
                if (options.moduleKind === ts.ModuleKind.CommonJS) {
                    // `transpileModule`/isolated emit cannot link a synthetic
                    // import alias to the generated call, so bind the helper
                    // with a real require in CommonJS output.
                    imports.push(factory.createVariableStatement(undefined, factory.createVariableDeclarationList([
                        factory.createVariableDeclaration(local, undefined, undefined,
                            factory.createPropertyAccessExpression(
                                factory.createCallExpression(factory.createIdentifier('require'), undefined, [factory.createStringLiteral(moduleName)]),
                                exported
                            ))
                    ], ts.NodeFlags.Const)));
                    return;
                }
                imports.push(factory.createImportDeclaration(
                    undefined,
                    factory.createImportClause(false, undefined, factory.createNamedImports([
                        factory.createImportSpecifier(false, factory.createIdentifier(exported), factory.createIdentifier(local))
                    ])),
                    factory.createStringLiteral(moduleName)
                ));
            };
            if (usesIoc) {
                addHelperBinding('__aotDeco', '@tsdi/ioc', 'applyPrecompiledDecorators');
            }
            if (usesAotType) {
                addHelperBinding('__aotType', '@tsdi/ioc', 'applyPrecompiledType');
            }
            if (usesAotComponent) {
                addHelperBinding('__aotComponent', '@tsdi/components', 'applyPrecompiledComponent');
            }
            if (usesAotDirective) {
                addHelperBinding('__aotDirective', '@tsdi/components', 'applyPrecompiledDirective');
            }
            if (usesAspect) {
                addHelperBinding('__aotAspect', '@tsdi/aop', 'registerPrecompiledAspect');
            }
            if (usesNoPointcut) {
                addHelperBinding('__aotNoPointcut', '@tsdi/aop', 'registerPrecompiledNoPointcut');
            }
            return factory.updateSourceFile(sourceFile, [...imports, ...statements]);
        };
    };
}

/** @deprecated Use {@link createAotTransformer}. */
export const createDecoratorPrecompileTransformer = createAotTransformer;
