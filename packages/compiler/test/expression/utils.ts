/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
    AstVisitor, AST, PropertyRead, ImplicitReceiver, PropertyWrite, Binary, Chain, Conditional, BindingPipe,
    FunctionCall, Interpolation, KeyedRead, KeyedWrite, LiteralArray, LiteralMap, LiteralPrimitive, MethodCall,
    PrefixNot, NonNullAssert, SafePropertyRead, SafeMethodCall, Quote, RecursiveAstVisitor, ParseSpan
} from '../../src/expression_parser/ast';
import { InterpolationConfig, DEFAULT_INTERPOLATION_CONFIG } from '../../src/ml_parser/interpolation_config';


class Unparser implements AstVisitor {
    private static _quoteRegExp = /"/g;
    // TODO(issue/24571): remove '!'.
    private _expression !: string;
    // TODO(issue/24571): remove '!'.
    private _interpolationConfig !: InterpolationConfig;

    unparse(ast: AST, interpolationConfig: InterpolationConfig) {
        this._expression = '';
        this._interpolationConfig = interpolationConfig;
        this._visit(ast);
        return this._expression;
    }

    visitPropertyRead(ast: PropertyRead, context: any) {
        this._visit(ast.receiver);
        this._expression += ast.receiver instanceof ImplicitReceiver ? `${ast.name}` : `.${ast.name}`;
    }

    visitPropertyWrite(ast: PropertyWrite, context: any) {
        this._visit(ast.receiver);
        this._expression +=
            ast.receiver instanceof ImplicitReceiver ? `${ast.name} = ` : `.${ast.name} = `;
        this._visit(ast.value);
    }

    visitBinary(ast: Binary, context: any) {
        this._visit(ast.left);
        this._expression += ` ${ast.operation} `;
        this._visit(ast.right);
    }

    visitChain(ast: Chain, context: any) {
        const len = ast.expressions.length;
        for (let i = 0; i < len; i++) {
            this._visit(ast.expressions[i]);
            this._expression += i === len - 1 ? ';' : '; ';
        }
    }

    visitConditional(ast: Conditional, context: any) {
        this._visit(ast.condition);
        this._expression += ' ? ';
        this._visit(ast.trueExp);
        this._expression += ' : ';
        this._visit(ast.falseExp);
    }

    visitPipe(ast: BindingPipe, context: any) {
        this._expression += '(';
        this._visit(ast.exp);
        this._expression += ` | ${ast.name}`;
        ast.args.forEach(arg => {
            this._expression += ':';
            this._visit(arg);
        });
        this._expression += ')';
    }

    visitFunctionCall(ast: FunctionCall, context: any) {
        this._visit(ast.target!);
        this._expression += '(';
        let isFirst = true;
        ast.args.forEach(arg => {
            if (!isFirst) {
                this._expression += ', ';
            }
            isFirst = false;
            this._visit(arg);
        });
        this._expression += ')';
    }

    visitImplicitReceiver(ast: ImplicitReceiver, context: any) { }

    visitInterpolation(ast: Interpolation, context: any) {
        for (let i = 0; i < ast.strings.length; i++) {
            this._expression += ast.strings[i];
            if (i < ast.expressions.length) {
                this._expression += `${this._interpolationConfig.start} `;
                this._visit(ast.expressions[i]);
                this._expression += ` ${this._interpolationConfig.end}`;
            }
        }
    }

    visitKeyedRead(ast: KeyedRead, context: any) {
        this._visit(ast.obj);
        this._expression += '[';
        this._visit(ast.key);
        this._expression += ']';
    }

    visitKeyedWrite(ast: KeyedWrite, context: any) {
        this._visit(ast.obj);
        this._expression += '[';
        this._visit(ast.key);
        this._expression += '] = ';
        this._visit(ast.value);
    }

    visitLiteralArray(ast: LiteralArray, context: any) {
        this._expression += '[';
        let isFirst = true;
        ast.expressions.forEach(expression => {
            if (!isFirst) this._expression += ', ';
            isFirst = false;
            this._visit(expression);
        });

        this._expression += ']';
    }

    visitLiteralMap(ast: LiteralMap, context: any) {
        this._expression += '{';
        let isFirst = true;
        for (let i = 0; i < ast.keys.length; i++) {
            if (!isFirst) this._expression += ', ';
            isFirst = false;
            const key = ast.keys[i];
            this._expression += key.quoted ? JSON.stringify(key.key) : key.key;
            this._expression += ': ';
            this._visit(ast.values[i]);
        }

        this._expression += '}';
    }

    visitLiteralPrimitive(ast: LiteralPrimitive, context: any) {
        if (typeof ast.value === 'string') {
            this._expression += `"${ast.value.replace(Unparser._quoteRegExp, '\"')}"`;
        } else {
            this._expression += `${ast.value}`;
        }
    }

    visitMethodCall(ast: MethodCall, context: any) {
        this._visit(ast.receiver);
        this._expression += ast.receiver instanceof ImplicitReceiver ? `${ast.name}(` : `.${ast.name}(`;
        let isFirst = true;
        ast.args.forEach(arg => {
            if (!isFirst) this._expression += ', ';
            isFirst = false;
            this._visit(arg);
        });
        this._expression += ')';
    }

    visitPrefixNot(ast: PrefixNot, context: any) {
        this._expression += '!';
        this._visit(ast.expression);
    }

    visitNonNullAssert(ast: NonNullAssert, context: any) {
        this._visit(ast.expression);
        this._expression += '!';
    }

    visitSafePropertyRead(ast: SafePropertyRead, context: any) {
        this._visit(ast.receiver);
        this._expression += `?.${ast.name}`;
    }

    visitSafeMethodCall(ast: SafeMethodCall, context: any) {
        this._visit(ast.receiver);
        this._expression += `?.${ast.name}(`;
        let isFirst = true;
        ast.args.forEach(arg => {
            if (!isFirst) this._expression += ', ';
            isFirst = false;
            this._visit(arg);
        });
        this._expression += ')';
    }

    visitQuote(ast: Quote, context: any) {
        this._expression += `${ast.prefix}:${ast.uninterpretedExpression}`;
    }

    private _visit(ast: AST) { ast.visit(this); }
}

const sharedUnparser = new Unparser();

export function unparse(
    ast: AST, interpolationConfig: InterpolationConfig = DEFAULT_INTERPOLATION_CONFIG): string {
    return sharedUnparser.unparse(ast, interpolationConfig);
}


class ASTValidator extends RecursiveAstVisitor {
    private parentSpan: ParseSpan | undefined;

    visit(ast: AST) {
        this.parentSpan = undefined;
        ast.visit(this);
    }

    validate(ast: AST, cb: () => void): void {
        if (!inSpan(ast.span, this.parentSpan)) {
            if (this.parentSpan) {
                const parentSpan = this.parentSpan as ParseSpan;
                throw Error(
                    `Invalid AST span [expected (${ast.span.start}, ${ast.span.end}) to be in (${parentSpan.start},  ${parentSpan.end}) for ${unparse(ast)}`);
            } else {
                throw Error(`Invalid root AST span for ${unparse(ast)}`);
            }
        }
        const oldParent = this.parentSpan;
        this.parentSpan = ast.span;
        cb();
        this.parentSpan = oldParent;
    }

    visitBinary(ast: Binary, context: any): any {
        this.validate(ast, () => super.visitBinary(ast, context));
    }

    visitChain(ast: Chain, context: any): any {
        this.validate(ast, () => super.visitChain(ast, context));
    }

    visitConditional(ast: Conditional, context: any): any {
        this.validate(ast, () => super.visitConditional(ast, context));
    }

    visitFunctionCall(ast: FunctionCall, context: any): any {
        this.validate(ast, () => super.visitFunctionCall(ast, context));
    }

    visitImplicitReceiver(ast: ImplicitReceiver, context: any): any {
        this.validate(ast, () => super.visitImplicitReceiver(ast, context));
    }

    visitInterpolation(ast: Interpolation, context: any): any {
        this.validate(ast, () => super.visitInterpolation(ast, context));
    }

    visitKeyedRead(ast: KeyedRead, context: any): any {
        this.validate(ast, () => super.visitKeyedRead(ast, context));
    }

    visitKeyedWrite(ast: KeyedWrite, context: any): any {
        this.validate(ast, () => super.visitKeyedWrite(ast, context));
    }

    visitLiteralArray(ast: LiteralArray, context: any): any {
        this.validate(ast, () => super.visitLiteralArray(ast, context));
    }

    visitLiteralMap(ast: LiteralMap, context: any): any {
        this.validate(ast, () => super.visitLiteralMap(ast, context));
    }

    visitLiteralPrimitive(ast: LiteralPrimitive, context: any): any {
        this.validate(ast, () => super.visitLiteralPrimitive(ast, context));
    }

    visitMethodCall(ast: MethodCall, context: any): any {
        this.validate(ast, () => super.visitMethodCall(ast, context));
    }

    visitPipe(ast: BindingPipe, context: any): any {
        this.validate(ast, () => super.visitPipe(ast, context));
    }

    visitPrefixNot(ast: PrefixNot, context: any): any {
        this.validate(ast, () => super.visitPrefixNot(ast, context));
    }

    visitPropertyRead(ast: PropertyRead, context: any): any {
        this.validate(ast, () => super.visitPropertyRead(ast, context));
    }

    visitPropertyWrite(ast: PropertyWrite, context: any): any {
        this.validate(ast, () => super.visitPropertyWrite(ast, context));
    }

    visitQuote(ast: Quote, context: any): any {
        this.validate(ast, () => super.visitQuote(ast, context));
    }

    visitSafeMethodCall(ast: SafeMethodCall, context: any): any {
        this.validate(ast, () => super.visitSafeMethodCall(ast, context));
    }

    visitSafePropertyRead(ast: SafePropertyRead, context: any): any {
        this.validate(ast, () => super.visitSafePropertyRead(ast, context));
    }
}

function inSpan(span: ParseSpan, parentSpan: ParseSpan | undefined): parentSpan is ParseSpan {
    return !parentSpan || (span.start >= parentSpan.start && span.end <= parentSpan.end);
}

const sharedValidator = new ASTValidator();

export function validate<T extends AST>(ast: T): T {
    sharedValidator.visit(ast);
    return ast;
}
