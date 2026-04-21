"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataGenerator = void 0;
const ts = require("typescript");
const path = require("path");
const fs = require("fs");
class MetadataGenerator {
    constructor(options = {}) {
        this.typeChecker = null;
        this.program = null;
        this.options = {
            version: 4,
            includeClassMetadata: true,
            includeDecoratorArgs: true,
            flattenDeclarations: true,
            ...options
        };
    }
    compile(sourceFile, typeChecker) {
        this.typeChecker = typeChecker;
        const metadata = [];
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
    compileModule(filePath, compilerOptions) {
        this.program = ts.createProgram([filePath], compilerOptions);
        this.typeChecker = this.program.getTypeChecker();
        const sourceFile = this.program.getSourceFile(filePath);
        const metadata = {};
        const origins = {};
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
            version: this.options.version,
            metadata,
            origins
        };
    }
    extractClassMetadata(node, sourceFile) {
        const name = node.name?.text || 'Anonymous';
        const classMeta = {
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
    extractClassDecorators(node) {
        const decorators = [];
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
    parseDecorator(decorator) {
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
    extractMembers(node, sourceFile) {
        const members = {};
        for (const member of node.members) {
            if (ts.isConstructorDeclaration(member)) {
                const params = this.extractParameters(member);
                if (params.length > 0) {
                    members['__ctor__'] = [{
                            __symbolic: 'constructor',
                            parameters: params
                        }];
                }
            }
            else if (ts.isPropertyDeclaration(member) && member.name) {
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
            }
            else if (ts.isMethodDeclaration(member) && member.name) {
                const methodName = ts.isIdentifier(member.name) ? member.name.text : member.name.getText();
                const memberMeta = { __symbolic: 'method' };
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
    extractParameters(node) {
        return node.parameters.map(param => {
            const paramMeta = {
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
    extractMemberDecorators(node) {
        const decorators = [];
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
    serializeValue(node) {
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
            const obj = {};
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
    writeMetadataFile(moduleMetadata, outputPath) {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(outputPath, JSON.stringify(moduleMetadata, null, 2), 'utf-8');
    }
    compileAnnotation(node, sourceFile) {
        const name = node.name?.text || 'Anonymous';
        const annotation = {
            name,
            type: node
        };
        const abstract = node.modifiers?.some(m => m.getText() === 'abstract');
        if (abstract) {
            annotation.abstract = true;
        }
        const methods = {};
        for (const member of node.members) {
            if (ts.isConstructorDeclaration(member) && member.parameters.length > 0) {
                methods['constructor'] = {
                    params: member.parameters.map(p => ({
                        name: ts.isIdentifier(p.name) ? p.name.text : p.name.getText(),
                        type: p.type ? { name: p.type.getText() } : undefined
                    }))
                };
            }
            else if (ts.isMethodDeclaration(member) && member.name) {
                const methodName = ts.isIdentifier(member.name) ? member.name.text : member.name.getText();
                if (member.parameters.length > 0 || member.type) {
                    methods[methodName] = {
                        params: member.parameters.map(p => ({
                            name: ts.isIdentifier(p.name) ? p.name.text : p.name.getText(),
                            type: p.type ? { name: p.type.getText() } : undefined
                        })),
                        returnType: member.type ? { name: member.type.getText() } : undefined
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
exports.MetadataGenerator = MetadataGenerator;
//# sourceMappingURL=MetadataGenerator.js.map