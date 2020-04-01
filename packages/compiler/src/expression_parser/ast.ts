/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {SecurityContext} from '../core';
import {ParseSourceSpan} from '../parse_util';

export class ParserError {
  public message: string;
  constructor(
      message: string, public input: string, public errLocation: string, public ctxLocation?: any) {
    this.message = `Parser Error: ${message} ${errLocation} [${input}] in ${ctxLocation}`;
  }
}

export class ParseSpan {
  constructor(public start: number, public end: number) {}
  toAbsolute(absoluteOffset: number): AbsoluteSourceSpan {
    return new AbsoluteSourceSpan(absoluteOffset + this.start, absoluteOffset + this.end);
  }
}

export class AST {
  constructor(
      public span: ParseSpan,
      /**
       * Absolute location of the expression AST in a source code file.
       */
      public sourceSpan: AbsoluteSourceSpan) {}
  visit(visitor: AstVisitor, context: any = null): any { return null; }
  toString(): string { return 'AST'; }
}

/**
 * Represents a quoted expression of the form:
 *
 * quote = prefix `:` uninterpretedExpression
 * prefix = identifier
 * uninterpretedExpression = arbitrary string
 *
 * A quoted expression is meant to be pre-processed by an AST transformer that
 * converts it into another AST that no longer contains quoted expressions.
 * It is meant to allow third-party developers to extend Angular template
 * expression language. The `uninterpretedExpression` part of the quote is
 * therefore not interpreted by the Angular's own expression parser.
 */
export class Quote extends AST {
  constructor(
      span: ParseSpan, sourceSpan: AbsoluteSourceSpan, public prefix: string,
      public uninterpretedExpression: string, public location: any) {
    super(span, sourceSpan);
  }
  visit(visitor: AstVisitor, context: any = null): any { return visitor.visitQuote(this, context); }
  toString(): string { return 'Quote'; }
}

export class EmptyExpr extends AST {
  visit(visitor: AstVisitor, context: any = null) {
    // do nothing
  }
}

export class ImplicitReceiver extends AST {
  visit(visitor: AstVisitor, context: any = null): any {
    return visitor.visitImplicitReceiver(this, context);
  }
}

/**
 * Multiple expressions separated by a semicolon.
 */
export class Chain extends AST {
  constructor(span: ParseSpan, sourceSpan: AbsoluteSourceSpan, public expressions: any[]) {
    super(span, sourceSpan);
  }
  visit(visitor: AstVisitor, context: any = null): any { return visitor.visitChain(this, context); }
}

export class Conditional extends AST {
  constructor(
      span: ParseSpan, sourceSpan: AbsoluteSourceSpan, public condition: AST, public trueExp: AST,
      public falseExp: AST) {
    super(span, sourceSpan);
  }
  visit(visitor: AstVisitor, context: any = null): any {
    return visitor.visitConditional(this, context);
  }
}

export class PropertyRead extends AST {
  constructor(
      span: ParseSpan, sourceSpan: AbsoluteSourceSpan, public receiver: AST, public name: string) {
    super(span, sourceSpan);
  }
  visit(visitor: AstVisitor, context: any = null): any {
    return visitor.visitPropertyRead(this, context);
  }
}

export class PropertyWrite extends AST {
  constructor(
      span: ParseSpan, sourceSpan: AbsoluteSourceSpan, public receiver: AST, public name: string,
      public value: AST) {
    super(span, sourceSpan);
  }
  visit(visitor: AstVisitor, context: any = null): any {
    return visitor.visitPropertyWrite(this, context);
  }
}

export class SafePropertyRead extends AST {
  constructor(
      span: ParseSpan, sourceSpan: AbsoluteSourceSpan, public receiver: AST, public name: string) {
    super(span, sourceSpan);
  }
  visit(visitor: AstVisitor, context: any = null): any {
    return visitor.visitSafePropertyRead(this, context);
  }
}

export class KeyedRead extends AST {
  constructor(span: ParseSpan, sourceSpan: AbsoluteSourceSpan, public obj: AST, public key: AST) {
    super(span, sourceSpan);
  }
  visit(visitor: AstVisitor, context: any = null): any {
    return visitor.visitKeyedRead(this, context);
  }
}

export class KeyedWrite extends AST {
  constructor(
      span: ParseSpan, sourceSpan: AbsoluteSourceSpan, public obj: AST, public key: AST,
      public value: AST) {
    super(span, sourceSpan);
  }
  visit(visitor: AstVisitor, context: any = null): any {
    return visitor.visitKeyedWrite(this, context);
  }
}

export class BindingPipe extends AST {
  constructor(
      span: ParseSpan, sourceSpan: AbsoluteSourceSpan, public exp: AST, public name: string,
      public args: any[], public nameSpan: AbsoluteSourceSpan) {
    super(span, sourceSpan);
  }
  visit(visitor: AstVisitor, context: any = null): any { return visitor.visitPipe(this, context); }
}

export class LiteralPrimitive extends AST {
  constructor(span: ParseSpan, sourceSpan: AbsoluteSourceSpan, public value: any) {
    super(span, sourceSpan);
  }
  visit(visitor: AstVisitor, context: any = null): any {
    return visitor.visitLiteralPrimitive(this, context);
  }
}

export class LiteralArray extends AST {
  constructor(span: ParseSpan, sourceSpan: AbsoluteSourceSpan, public expressions: any[]) {
    super(span, sourceSpan);
  }
  visit(visitor: AstVisitor, context: any = null): any {
    return visitor.visitLiteralArray(this, context);
  }
}

export type LiteralMapKey = {
  key: string; quoted: boolean;
};

export class LiteralMap extends AST {
  constructor(
      span: ParseSpan, sourceSpan: AbsoluteSourceSpan, public keys: LiteralMapKey[],
      public values: any[]) {
    super(span, sourceSpan);
  }
  visit(visitor: AstVisitor, context: any = null): any {
    return visitor.visitLiteralMap(this, context);
  }
}

export class Interpolation extends AST {
  constructor(
      span: ParseSpan, sourceSpan: AbsoluteSourceSpan, public strings: any[],
      public expressions: any[]) {
    super(span, sourceSpan);
  }
  visit(visitor: AstVisitor, context: any = null): any {
    return visitor.visitInterpolation(this, context);
  }
}

export class Binary extends AST {
  constructor(
      span: ParseSpan, sourceSpan: AbsoluteSourceSpan, public operation: string, public left: AST,
      public right: AST) {
    super(span, sourceSpan);
  }
  visit(visitor: AstVisitor, context: any = null): any {
    return visitor.visitBinary(this, context);
  }
}

export class PrefixNot extends AST {
  constructor(span: ParseSpan, sourceSpan: AbsoluteSourceSpan, public expression: AST) {
    super(span, sourceSpan);
  }
  visit(visitor: AstVisitor, context: any = null): any {
    return visitor.visitPrefixNot(this, context);
  }
}

export class NonNullAssert extends AST {
  constructor(span: ParseSpan, sourceSpan: AbsoluteSourceSpan, public expression: AST) {
    super(span, sourceSpan);
  }
  visit(visitor: AstVisitor, context: any = null): any {
    return visitor.visitNonNullAssert(this, context);
  }
}

export class MethodCall extends AST {
  constructor(
      span: ParseSpan, sourceSpan: AbsoluteSourceSpan, public receiver: AST, public name: string,
      public args: any[]) {
    super(span, sourceSpan);
  }
  visit(visitor: AstVisitor, context: any = null): any {
    return visitor.visitMethodCall(this, context);
  }
}

export class SafeMethodCall extends AST {
  constructor(
      span: ParseSpan, sourceSpan: AbsoluteSourceSpan, public receiver: AST, public name: string,
      public args: any[]) {
    super(span, sourceSpan);
  }
  visit(visitor: AstVisitor, context: any = null): any {
    return visitor.visitSafeMethodCall(this, context);
  }
}

export class FunctionCall extends AST {
  constructor(
      span: ParseSpan, sourceSpan: AbsoluteSourceSpan, public target: AST|null,
      public args: any[]) {
    super(span, sourceSpan);
  }
  visit(visitor: AstVisitor, context: any = null): any {
    return visitor.visitFunctionCall(this, context);
  }
}

/**
 * Records the absolute position of a text span in a source file, where `start` and `end` are the
 * starting and ending byte offsets, respectively, of the text span in a source file.
 */
export class AbsoluteSourceSpan {
  constructor(public readonly start: number, public readonly end: number) {}
}

export class ASTWithSource extends AST {
  constructor(
      public ast: AST, public source: string|null, public location: string, absoluteOffset: number,
      public errors: ParserError[]) {
    super(
        new ParseSpan(0, source === null ? 0 : source.length),
        new AbsoluteSourceSpan(
            absoluteOffset, source === null ? absoluteOffset : absoluteOffset + source.length));
  }
  visit(visitor: AstVisitor, context: any = null): any {
    if (visitor.visitASTWithSource) {
      return visitor.visitASTWithSource(this, context);
    }
    return this.ast.visit(visitor, context);
  }
  toString(): string { return `${this.source} in ${this.location}`; }
}

/**
 * TemplateBinding refers to a particular key-value pair in a microsyntax
 * expression. A few examples are:
 *
 *   |---------------------|--------------|---------|--------------|
 *   |     expression      |     key      |  value  | binding type |
 *   |---------------------|--------------|---------|--------------|
 *   | 1. let item         |    item      |  null   |   variable   |
 *   | 2. of items         |   ngForOf    |  items  |  expression  |
 *   | 3. let x = y        |      x       |    y    |   variable   |
 *   | 4. index as i       |      i       |  index  |   variable   |
 *   | 5. trackBy: func    | ngForTrackBy |   func  |  expression  |
 *   | 6. *ngIf="cond"     |     ngIf     |   cond  |  expression  |
 *   |---------------------|--------------|---------|--------------|
 *
 * (6) is a notable exception because it is a binding from the template key in
 * the LHS of a HTML attribute to the expression in the RHS. All other bindings
 * in the example above are derived solely from the RHS.
 */
export type TemplateBinding = VariableBinding | ExpressionBinding;

export class VariableBinding {
  /**
   * @param sourceSpan entire span of the binding.
   * @param key name of the LHS along with its span.
   * @param value optional value for the RHS along with its span.
   */
  constructor(
      public readonly sourceSpan: AbsoluteSourceSpan,
      public readonly key: TemplateBindingIdentifier,
      public readonly value: TemplateBindingIdentifier|null) {}
}

export class ExpressionBinding {
  /**
   * @param sourceSpan entire span of the binding.
   * @param key binding name, like ngForOf, ngForTrackBy, ngIf, along with its
   * span. Note that the length of the span may not be the same as
   * `key.source.length`. For example,
   * 1. key.source = ngFor, key.span is for "ngFor"
   * 2. key.source = ngForOf, key.span is for "of"
   * 3. key.source = ngForTrackBy, key.span is for "trackBy"
   * @param value optional expression for the RHS.
   */
  constructor(
      public readonly sourceSpan: AbsoluteSourceSpan,
      public readonly key: TemplateBindingIdentifier, public readonly value: ASTWithSource|null) {}
}

export interface TemplateBindingIdentifier {
  source: string;
  span: AbsoluteSourceSpan;
}

export interface AstVisitor {
  visitBinary(ast: Binary, context: any): any;
  visitChain(ast: Chain, context: any): any;
  visitConditional(ast: Conditional, context: any): any;
  visitFunctionCall(ast: FunctionCall, context: any): any;
  visitImplicitReceiver(ast: ImplicitReceiver, context: any): any;
  visitInterpolation(ast: Interpolation, context: any): any;
  visitKeyedRead(ast: KeyedRead, context: any): any;
  visitKeyedWrite(ast: KeyedWrite, context: any): any;
  visitLiteralArray(ast: LiteralArray, context: any): any;
  visitLiteralMap(ast: LiteralMap, context: any): any;
  visitLiteralPrimitive(ast: LiteralPrimitive, context: any): any;
  visitMethodCall(ast: MethodCall, context: any): any;
  visitPipe(ast: BindingPipe, context: any): any;
  visitPrefixNot(ast: PrefixNot, context: any): any;
  visitNonNullAssert(ast: NonNullAssert, context: any): any;
  visitPropertyRead(ast: PropertyRead, context: any): any;
  visitPropertyWrite(ast: PropertyWrite, context: any): any;
  visitQuote(ast: Quote, context: any): any;
  visitSafeMethodCall(ast: SafeMethodCall, context: any): any;
  visitSafePropertyRead(ast: SafePropertyRead, context: any): any;
  visitASTWithSource?(ast: ASTWithSource, context: any): any;
  /**
   * This function is optionally defined to allow classes that implement this
   * interface to selectively decide if the specified `ast` should be visited.
   * @param ast node to visit
   * @param context context that gets passed to the node and all its children
   */
  visit?(ast: AST, context?: any): any;
}

export class RecursiveAstVisitor implements AstVisitor {
  visit(ast: AST, context?: any): any {
    // The default implementation just visits every node.
    // Classes that extend RecursiveAstVisitor should override this function
    // to selectively visit the specified node.
    ast.visit(this, context);
  }
  visitBinary(ast: Binary, context: any): any {
    this.visit(ast.left, context);
    this.visit(ast.right, context);
  }
  visitChain(ast: Chain, context: any): any { this.visitAll(ast.expressions, context); }
  visitConditional(ast: Conditional, context: any): any {
    this.visit(ast.condition, context);
    this.visit(ast.trueExp, context);
    this.visit(ast.falseExp, context);
  }
  visitPipe(ast: BindingPipe, context: any): any {
    this.visit(ast.exp, context);
    this.visitAll(ast.args, context);
  }
  visitFunctionCall(ast: FunctionCall, context: any): any {
    if (ast.target) {
      this.visit(ast.target, context);
    }
    this.visitAll(ast.args, context);
  }
  visitImplicitReceiver(ast: ImplicitReceiver, context: any): any {}
  visitInterpolation(ast: Interpolation, context: any): any {
    this.visitAll(ast.expressions, context);
  }
  visitKeyedRead(ast: KeyedRead, context: any): any {
    this.visit(ast.obj, context);
    this.visit(ast.key, context);
  }
  visitKeyedWrite(ast: KeyedWrite, context: any): any {
    this.visit(ast.obj, context);
    this.visit(ast.key, context);
    this.visit(ast.value, context);
  }
  visitLiteralArray(ast: LiteralArray, context: any): any {
    this.visitAll(ast.expressions, context);
  }
  visitLiteralMap(ast: LiteralMap, context: any): any { this.visitAll(ast.values, context); }
  visitLiteralPrimitive(ast: LiteralPrimitive, context: any): any {}
  visitMethodCall(ast: MethodCall, context: any): any {
    this.visit(ast.receiver, context);
    this.visitAll(ast.args, context);
  }
  visitPrefixNot(ast: PrefixNot, context: any): any { this.visit(ast.expression, context); }
  visitNonNullAssert(ast: NonNullAssert, context: any): any { this.visit(ast.expression, context); }
  visitPropertyRead(ast: PropertyRead, context: any): any { this.visit(ast.receiver, context); }
  visitPropertyWrite(ast: PropertyWrite, context: any): any {
    this.visit(ast.receiver, context);
    this.visit(ast.value, context);
  }
  visitSafePropertyRead(ast: SafePropertyRead, context: any): any {
    this.visit(ast.receiver, context);
  }
  visitSafeMethodCall(ast: SafeMethodCall, context: any): any {
    this.visit(ast.receiver, context);
    this.visitAll(ast.args, context);
  }
  visitQuote(ast: Quote, context: any): any {}
  // This is not part of the AstVisitor interface, just a helper method
  visitAll(asts: AST[], context: any): any {
    for (const ast of asts) {
      this.visit(ast, context);
    }
  }
}

export class AstTransformer implements AstVisitor {
  visitImplicitReceiver(ast: ImplicitReceiver, context: any): AST { return ast; }

  visitInterpolation(ast: Interpolation, context: any): AST {
    return new Interpolation(ast.span, ast.sourceSpan, ast.strings, this.visitAll(ast.expressions));
  }

  visitLiteralPrimitive(ast: LiteralPrimitive, context: any): AST {
    return new LiteralPrimitive(ast.span, ast.sourceSpan, ast.value);
  }

  visitPropertyRead(ast: PropertyRead, context: any): AST {
    return new PropertyRead(ast.span, ast.sourceSpan, ast.receiver.visit(this), ast.name);
  }

  visitPropertyWrite(ast: PropertyWrite, context: any): AST {
    return new PropertyWrite(
        ast.span, ast.sourceSpan, ast.receiver.visit(this), ast.name, ast.value.visit(this));
  }

  visitSafePropertyRead(ast: SafePropertyRead, context: any): AST {
    return new SafePropertyRead(ast.span, ast.sourceSpan, ast.receiver.visit(this), ast.name);
  }

  visitMethodCall(ast: MethodCall, context: any): AST {
    return new MethodCall(
        ast.span, ast.sourceSpan, ast.receiver.visit(this), ast.name, this.visitAll(ast.args));
  }

  visitSafeMethodCall(ast: SafeMethodCall, context: any): AST {
    return new SafeMethodCall(
        ast.span, ast.sourceSpan, ast.receiver.visit(this), ast.name, this.visitAll(ast.args));
  }

  visitFunctionCall(ast: FunctionCall, context: any): AST {
    return new FunctionCall(
        ast.span, ast.sourceSpan, ast.target !.visit(this), this.visitAll(ast.args));
  }

  visitLiteralArray(ast: LiteralArray, context: any): AST {
    return new LiteralArray(ast.span, ast.sourceSpan, this.visitAll(ast.expressions));
  }

  visitLiteralMap(ast: LiteralMap, context: any): AST {
    return new LiteralMap(ast.span, ast.sourceSpan, ast.keys, this.visitAll(ast.values));
  }

  visitBinary(ast: Binary, context: any): AST {
    return new Binary(
        ast.span, ast.sourceSpan, ast.operation, ast.left.visit(this), ast.right.visit(this));
  }

  visitPrefixNot(ast: PrefixNot, context: any): AST {
    return new PrefixNot(ast.span, ast.sourceSpan, ast.expression.visit(this));
  }

  visitNonNullAssert(ast: NonNullAssert, context: any): AST {
    return new NonNullAssert(ast.span, ast.sourceSpan, ast.expression.visit(this));
  }

  visitConditional(ast: Conditional, context: any): AST {
    return new Conditional(
        ast.span, ast.sourceSpan, ast.condition.visit(this), ast.trueExp.visit(this),
        ast.falseExp.visit(this));
  }

  visitPipe(ast: BindingPipe, context: any): AST {
    return new BindingPipe(
        ast.span, ast.sourceSpan, ast.exp.visit(this), ast.name, this.visitAll(ast.args),
        ast.nameSpan);
  }

  visitKeyedRead(ast: KeyedRead, context: any): AST {
    return new KeyedRead(ast.span, ast.sourceSpan, ast.obj.visit(this), ast.key.visit(this));
  }

  visitKeyedWrite(ast: KeyedWrite, context: any): AST {
    return new KeyedWrite(
        ast.span, ast.sourceSpan, ast.obj.visit(this), ast.key.visit(this), ast.value.visit(this));
  }

  visitAll(asts: any[]): any[] {
    const res = [];
    for (let i = 0; i < asts.length; ++i) {
      res[i] = asts[i].visit(this);
    }
    return res;
  }

  visitChain(ast: Chain, context: any): AST {
    return new Chain(ast.span, ast.sourceSpan, this.visitAll(ast.expressions));
  }

  visitQuote(ast: Quote, context: any): AST {
    return new Quote(
        ast.span, ast.sourceSpan, ast.prefix, ast.uninterpretedExpression, ast.location);
  }
}

// A transformer that only creates new nodes if the transformer makes a change or
// a change is made a child node.
export class AstMemoryEfficientTransformer implements AstVisitor {
  visitImplicitReceiver(ast: ImplicitReceiver, context: any): AST { return ast; }

  visitInterpolation(ast: Interpolation, context: any): Interpolation {
    const expressions = this.visitAll(ast.expressions);
    if (expressions !== ast.expressions)
      return new Interpolation(ast.span, ast.sourceSpan, ast.strings, expressions);
    return ast;
  }

  visitLiteralPrimitive(ast: LiteralPrimitive, context: any): AST { return ast; }

  visitPropertyRead(ast: PropertyRead, context: any): AST {
    const receiver = ast.receiver.visit(this);
    if (receiver !== ast.receiver) {
      return new PropertyRead(ast.span, ast.sourceSpan, receiver, ast.name);
    }
    return ast;
  }

  visitPropertyWrite(ast: PropertyWrite, context: any): AST {
    const receiver = ast.receiver.visit(this);
    const value = ast.value.visit(this);
    if (receiver !== ast.receiver || value !== ast.value) {
      return new PropertyWrite(ast.span, ast.sourceSpan, receiver, ast.name, value);
    }
    return ast;
  }

  visitSafePropertyRead(ast: SafePropertyRead, context: any): AST {
    const receiver = ast.receiver.visit(this);
    if (receiver !== ast.receiver) {
      return new SafePropertyRead(ast.span, ast.sourceSpan, receiver, ast.name);
    }
    return ast;
  }

  visitMethodCall(ast: MethodCall, context: any): AST {
    const receiver = ast.receiver.visit(this);
    const args = this.visitAll(ast.args);
    if (receiver !== ast.receiver || args !== ast.args) {
      return new MethodCall(ast.span, ast.sourceSpan, receiver, ast.name, args);
    }
    return ast;
  }

  visitSafeMethodCall(ast: SafeMethodCall, context: any): AST {
    const receiver = ast.receiver.visit(this);
    const args = this.visitAll(ast.args);
    if (receiver !== ast.receiver || args !== ast.args) {
      return new SafeMethodCall(ast.span, ast.sourceSpan, receiver, ast.name, args);
    }
    return ast;
  }

  visitFunctionCall(ast: FunctionCall, context: any): AST {
    const target = ast.target && ast.target.visit(this);
    const args = this.visitAll(ast.args);
    if (target !== ast.target || args !== ast.args) {
      return new FunctionCall(ast.span, ast.sourceSpan, target, args);
    }
    return ast;
  }

  visitLiteralArray(ast: LiteralArray, context: any): AST {
    const expressions = this.visitAll(ast.expressions);
    if (expressions !== ast.expressions) {
      return new LiteralArray(ast.span, ast.sourceSpan, expressions);
    }
    return ast;
  }

  visitLiteralMap(ast: LiteralMap, context: any): AST {
    const values = this.visitAll(ast.values);
    if (values !== ast.values) {
      return new LiteralMap(ast.span, ast.sourceSpan, ast.keys, values);
    }
    return ast;
  }

  visitBinary(ast: Binary, context: any): AST {
    const left = ast.left.visit(this);
    const right = ast.right.visit(this);
    if (left !== ast.left || right !== ast.right) {
      return new Binary(ast.span, ast.sourceSpan, ast.operation, left, right);
    }
    return ast;
  }

  visitPrefixNot(ast: PrefixNot, context: any): AST {
    const expression = ast.expression.visit(this);
    if (expression !== ast.expression) {
      return new PrefixNot(ast.span, ast.sourceSpan, expression);
    }
    return ast;
  }

  visitNonNullAssert(ast: NonNullAssert, context: any): AST {
    const expression = ast.expression.visit(this);
    if (expression !== ast.expression) {
      return new NonNullAssert(ast.span, ast.sourceSpan, expression);
    }
    return ast;
  }

  visitConditional(ast: Conditional, context: any): AST {
    const condition = ast.condition.visit(this);
    const trueExp = ast.trueExp.visit(this);
    const falseExp = ast.falseExp.visit(this);
    if (condition !== ast.condition || trueExp !== ast.trueExp || falseExp !== ast.falseExp) {
      return new Conditional(ast.span, ast.sourceSpan, condition, trueExp, falseExp);
    }
    return ast;
  }

  visitPipe(ast: BindingPipe, context: any): AST {
    const exp = ast.exp.visit(this);
    const args = this.visitAll(ast.args);
    if (exp !== ast.exp || args !== ast.args) {
      return new BindingPipe(ast.span, ast.sourceSpan, exp, ast.name, args, ast.nameSpan);
    }
    return ast;
  }

  visitKeyedRead(ast: KeyedRead, context: any): AST {
    const obj = ast.obj.visit(this);
    const key = ast.key.visit(this);
    if (obj !== ast.obj || key !== ast.key) {
      return new KeyedRead(ast.span, ast.sourceSpan, obj, key);
    }
    return ast;
  }

  visitKeyedWrite(ast: KeyedWrite, context: any): AST {
    const obj = ast.obj.visit(this);
    const key = ast.key.visit(this);
    const value = ast.value.visit(this);
    if (obj !== ast.obj || key !== ast.key || value !== ast.value) {
      return new KeyedWrite(ast.span, ast.sourceSpan, obj, key, value);
    }
    return ast;
  }

  visitAll(asts: any[]): any[] {
    const res = [];
    let modified = false;
    for (let i = 0; i < asts.length; ++i) {
      const original = asts[i];
      const value = original.visit(this);
      res[i] = value;
      modified = modified || value !== original;
    }
    return modified ? res : asts;
  }

  visitChain(ast: Chain, context: any): AST {
    const expressions = this.visitAll(ast.expressions);
    if (expressions !== ast.expressions) {
      return new Chain(ast.span, ast.sourceSpan, expressions);
    }
    return ast;
  }

  visitQuote(ast: Quote, context: any): AST { return ast; }
}

// Bindings

export class ParsedProperty {
  public readonly isLiteral: boolean;
  public readonly isAnimation: boolean;

  constructor(
      public name: string, public expression: ASTWithSource, public type: ParsedPropertyType,
      public sourceSpan: ParseSourceSpan, public valueSpan?: ParseSourceSpan) {
    this.isLiteral = this.type === ParsedPropertyType.LITERAL_ATTR;
    this.isAnimation = this.type === ParsedPropertyType.ANIMATION;
  }
}

export enum ParsedPropertyType {
  DEFAULT,
  LITERAL_ATTR,
  ANIMATION
}

export const enum ParsedEventType {
  // DOM or Directive event
  Regular,
  // Animation specific event
  Animation,
}

export class ParsedEvent {
  // Regular events have a target
  // Animation events have a phase
  constructor(
      public name: string, public targetOrPhase: string, public type: ParsedEventType,
      public handler: ASTWithSource, public sourceSpan: ParseSourceSpan,
      public handlerSpan: ParseSourceSpan) {}
}

/**
 * ParsedVariable represents a variable declaration in a microsyntax expression.
 */
export class ParsedVariable {
  constructor(
      public readonly name: string, public readonly value: string,
      public readonly sourceSpan: ParseSourceSpan, public readonly keySpan: ParseSourceSpan,
      public readonly valueSpan?: ParseSourceSpan) {}
}

export const enum BindingType {
  // A regular binding to a property (e.g. `[property]="expression"`).
  Property,
  // A binding to an element attribute (e.g. `[attr.name]="expression"`).
  Attribute,
  // A binding to a CSS class (e.g. `[class.name]="condition"`).
  Class,
  // A binding to a style rule (e.g. `[style.rule]="expression"`).
  Style,
  // A binding to an animation reference (e.g. `[animate.key]="expression"`).
  Animation,
}

export class BoundElementProperty {
  constructor(
      public name: string, public type: BindingType, public securityContext: SecurityContext,
      public value: ASTWithSource, public unit: string|null, public sourceSpan: ParseSourceSpan,
      public valueSpan?: ParseSourceSpan) {}
}
