/**
 * source range.
 */
export interface SourceRange {
    readonly start: number;
    readonly end: number;
}

export class ParserError {
    public message: string;
    constructor(
        message: string, public input: string, public errLocation: string, public ctxLocation?: any) {
        this.message = `Parser Error: ${message} ${errLocation} [${input}] in ${ctxLocation}`;
    }
}


/**
 * expression CodeRange.
 */
export class CodeRange {
    constructor(public start: number, public end: number) {

    }

    offset(offset: number): SourceRange {
        const start = offset + this.start;
        const end = offset + this.end;
        return { start, end };
    }
}

/**
 * Ast base.
 */
export abstract class Ast {
    constructor(public range: CodeRange, public sourceRange: Readonly<SourceRange>) {

    }
    abstract visit(visitor: AstVisitor, context?): any;
    toString(): string { return 'Ast'; }
}


export class EmptyExpr extends Ast {
    visit(visitor: AstVisitor, context?) {
        // do nothing
    }
}

/**
 * ast source.
 */
export class AstSource extends Ast {
    constructor(public ast: Ast, public source: string, public location: string, offset: number, public errors: ParserError[]) {
        super(
            new CodeRange(0, source ? source.length : 0),
            { start: offset, end: source ? source.length + offset : offset });
    }

    visit(visitor: AstVisitor, context?): any {
        if (visitor.visitASTWithSource) {
            return visitor.visitASTWithSource(this, context);
        }
        return this.ast.visit(visitor, context);
    }

    toString(): string { return `${this.source} in ${this.location}`; }
}

export class Quote extends Ast {
    constructor(range: CodeRange, sourceRange: SourceRange, public prefix: string,
        public uninterpretedExpression: string, public location: any) {
        super(range, sourceRange);
    }
    visit(visitor: AstVisitor, context?): any { return visitor.visitQuote(this, context); }
    toString(): string { return 'Quote'; }
}

export class ImplicitReceiver extends Ast {
    visit(visitor: AstVisitor, context?): any {
        return visitor.visitImplicitReceiver(this, context);
    }
}

/**
 * Multiple expressions separated by a semicolon.
 */
export class Chain extends Ast {
    constructor(range: CodeRange, sourceRange: SourceRange, public expressions: any[]) {
        super(range, sourceRange);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitChain(this, context);
    }
}

export class Conditional extends Ast {
    constructor(range: CodeRange, sourceRange: SourceRange, public condition: Ast, public trueExp: Ast,
        public falseExp: Ast) {
        super(range, sourceRange);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitConditional(this, context);
    }
}


export class PropertyRead extends Ast {
    constructor(
        range: CodeRange, sourceRange: SourceRange, public receiver: Ast, public name: string) {
        super(range, sourceRange);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitPropertyRead(this, context);
    }
}

export class PropertyWrite extends Ast {
    constructor(
        range: CodeRange, sourceRange: SourceRange, public receiver: Ast, public name: string,
        public value: Ast) {
        super(range, sourceRange);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitPropertyWrite(this, context);
    }
}

export class SafePropertyRead extends Ast {
    constructor(
        range: CodeRange, sourceRange: SourceRange, public receiver: Ast, public name: string) {
        super(range, sourceRange);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitSafePropertyRead(this, context);
    }
}

export class KeyedRead extends Ast {
    constructor(range: CodeRange, sourceRange: SourceRange, public obj: Ast, public key: Ast) {
        super(range, sourceRange);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitKeyedRead(this, context);
    }
}

export class KeyedWrite extends Ast {
    constructor(
        range: CodeRange, sourceRange: SourceRange, public obj: Ast, public key: Ast,
        public value: Ast) {
        super(range, sourceRange);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitKeyedWrite(this, context);
    }
}

export class BindingPipe extends Ast {
    constructor(
        range: CodeRange, sourceRange: SourceRange, public exp: Ast, public name: string,
        public args: any[], public nameSpan: CodeRange) {
        super(range, sourceRange);
    }
    visit(visitor: AstVisitor, context: any = null): any { return visitor.visitPipe(this, context); }
}

export class LiteralPrimitive extends Ast {
    constructor(range: CodeRange, sourceRange: SourceRange, public value: any) {
        super(range, sourceRange);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitLiteralPrimitive(this, context);
    }
}

export class LiteralArray extends Ast {
    constructor(range: CodeRange, sourceRange: SourceRange, public expressions: any[]) {
        super(range, sourceRange);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitLiteralArray(this, context);
    }
}

export type LiteralMapKey = {
    key: string; quoted: boolean;
};

export class LiteralMap extends Ast {
    constructor(
        range: CodeRange, sourceRange: SourceRange, public keys: LiteralMapKey[],
        public values: any[]) {
        super(range, sourceRange);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitLiteralMap(this, context);
    }
}

export class Interpolation extends Ast {
    constructor(
        range: CodeRange, sourceRange: SourceRange, public strings: any[],
        public expressions: any[]) {
        super(range, sourceRange);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitInterpolation(this, context);
    }
}

export class Binary extends Ast {
    constructor(
        range: CodeRange, sourceRange: SourceRange, public operation: string, public left: Ast,
        public right: Ast) {
        super(range, sourceRange);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitBinary(this, context);
    }
}

export class PrefixNot extends Ast {
    constructor(range: CodeRange, sourceRange: SourceRange, public expression: Ast) {
        super(range, sourceRange);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitPrefixNot(this, context);
    }
}

export class NonNullAssert extends Ast {
    constructor(range: CodeRange, sourceRange: SourceRange, public expression: Ast) {
        super(range, sourceRange);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitNonNullAssert(this, context);
    }
}

export class MethodCall extends Ast {
    constructor(
        range: CodeRange, sourceRange: SourceRange, public receiver: Ast, public name: string,
        public args: any[]) {
        super(range, sourceRange);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitMethodCall(this, context);
    }
}

export class SafeMethodCall extends Ast {
    constructor(
        range: CodeRange, sourceRange: SourceRange, public receiver: Ast, public name: string,
        public args: any[]) {
        super(range, sourceRange);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitSafeMethodCall(this, context);
    }
}

export class FunctionCall extends Ast {
    constructor(
        range: CodeRange, sourceRange: SourceRange, public target: Ast | null,
        public args: any[]) {
        super(range, sourceRange);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitFunctionCall(this, context);
    }
}

export class TemplateBinding {
    constructor(
        public range: CodeRange, public sourceRange: SourceRange, public key: string,
        public keyIsVar: boolean, public name: string, public expression: AstSource | null) { }
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
    visitASTWithSource?(ast: AstSource, context: any): any;
    visit?(ast: Ast, context?: any): any;
}

export class NullAstVisitor implements AstVisitor {
    visitBinary(ast: Binary, context: any): any { }
    visitChain(ast: Chain, context: any): any { }
    visitConditional(ast: Conditional, context: any): any { }
    visitFunctionCall(ast: FunctionCall, context: any): any { }
    visitImplicitReceiver(ast: ImplicitReceiver, context: any): any { }
    visitInterpolation(ast: Interpolation, context: any): any { }
    visitKeyedRead(ast: KeyedRead, context: any): any { }
    visitKeyedWrite(ast: KeyedWrite, context: any): any { }
    visitLiteralArray(ast: LiteralArray, context: any): any { }
    visitLiteralMap(ast: LiteralMap, context: any): any { }
    visitLiteralPrimitive(ast: LiteralPrimitive, context: any): any { }
    visitMethodCall(ast: MethodCall, context: any): any { }
    visitPipe(ast: BindingPipe, context: any): any { }
    visitPrefixNot(ast: PrefixNot, context: any): any { }
    visitNonNullAssert(ast: NonNullAssert, context: any): any { }
    visitPropertyRead(ast: PropertyRead, context: any): any { }
    visitPropertyWrite(ast: PropertyWrite, context: any): any { }
    visitQuote(ast: Quote, context: any): any { }
    visitSafeMethodCall(ast: SafeMethodCall, context: any): any { }
    visitSafePropertyRead(ast: SafePropertyRead, context: any): any { }
}

export class RecursiveAstVisitor implements AstVisitor {
    visitBinary(ast: Binary, context: any): any {
        ast.left.visit(this, context);
        ast.right.visit(this, context);
        return null;
    }
    visitChain(ast: Chain, context: any): any { return this.visitAll(ast.expressions, context); }
    visitConditional(ast: Conditional, context: any): any {
        ast.condition.visit(this, context);
        ast.trueExp.visit(this, context);
        ast.falseExp.visit(this, context);
        return null;
    }
    visitPipe(ast: BindingPipe, context: any): any {
        ast.exp.visit(this, context);
        this.visitAll(ast.args, context);
        return null;
    }
    visitFunctionCall(ast: FunctionCall, context: any): any {
        ast.target!.visit(this, context);
        this.visitAll(ast.args, context);
        return null;
    }
    visitImplicitReceiver(ast: ImplicitReceiver, context: any): any { return null; }
    visitInterpolation(ast: Interpolation, context: any): any {
        return this.visitAll(ast.expressions, context);
    }
    visitKeyedRead(ast: KeyedRead, context: any): any {
        ast.obj.visit(this, context);
        ast.key.visit(this, context);
        return null;
    }
    visitKeyedWrite(ast: KeyedWrite, context: any): any {
        ast.obj.visit(this, context);
        ast.key.visit(this, context);
        ast.value.visit(this, context);
        return null;
    }
    visitLiteralArray(ast: LiteralArray, context: any): any {
        return this.visitAll(ast.expressions, context);
    }
    visitLiteralMap(ast: LiteralMap, context: any): any { return this.visitAll(ast.values, context); }
    visitLiteralPrimitive(ast: LiteralPrimitive, context: any): any { return null; }
    visitMethodCall(ast: MethodCall, context: any): any {
        ast.receiver.visit(this, context);
        return this.visitAll(ast.args, context);
    }
    visitPrefixNot(ast: PrefixNot, context: any): any {
        ast.expression.visit(this, context);
        return null;
    }
    visitNonNullAssert(ast: NonNullAssert, context: any): any {
        ast.expression.visit(this, context);
        return null;
    }
    visitPropertyRead(ast: PropertyRead, context: any): any {
        ast.receiver.visit(this, context);
        return null;
    }
    visitPropertyWrite(ast: PropertyWrite, context: any): any {
        ast.receiver.visit(this, context);
        ast.value.visit(this, context);
        return null;
    }
    visitSafePropertyRead(ast: SafePropertyRead, context: any): any {
        ast.receiver.visit(this, context);
        return null;
    }
    visitSafeMethodCall(ast: SafeMethodCall, context: any): any {
        ast.receiver.visit(this, context);
        return this.visitAll(ast.args, context);
    }
    visitAll(asts: Ast[], context: any): any {
        asts.forEach(ast => ast.visit(this, context));
        return null;
    }
    visitQuote(ast: Quote, context: any): any { return null; }
}

export class AstTransformer implements AstVisitor {
    visitImplicitReceiver(ast: ImplicitReceiver, context: any): Ast { return ast; }

    visitInterpolation(ast: Interpolation, context: any): Ast {
        return new Interpolation(ast.range, ast.sourceRange, ast.strings, this.visitAll(ast.expressions));
    }

    visitLiteralPrimitive(ast: LiteralPrimitive, context: any): Ast {
        return new LiteralPrimitive(ast.range, ast.sourceRange, ast.value);
    }

    visitPropertyRead(ast: PropertyRead, context: any): Ast {
        return new PropertyRead(ast.range, ast.sourceRange, ast.receiver.visit(this), ast.name);
    }

    visitPropertyWrite(ast: PropertyWrite, context: any): Ast {
        return new PropertyWrite(
            ast.range, ast.sourceRange, ast.receiver.visit(this), ast.name, ast.value.visit(this));
    }

    visitSafePropertyRead(ast: SafePropertyRead, context: any): Ast {
        return new SafePropertyRead(ast.range, ast.sourceRange, ast.receiver.visit(this), ast.name);
    }

    visitMethodCall(ast: MethodCall, context: any): Ast {
        return new MethodCall(
            ast.range, ast.sourceRange, ast.receiver.visit(this), ast.name, this.visitAll(ast.args));
    }

    visitSafeMethodCall(ast: SafeMethodCall, context: any): Ast {
        return new SafeMethodCall(
            ast.range, ast.sourceRange, ast.receiver.visit(this), ast.name, this.visitAll(ast.args));
    }

    visitFunctionCall(ast: FunctionCall, context: any): Ast {
        return new FunctionCall(
            ast.range, ast.sourceRange, ast.target!.visit(this), this.visitAll(ast.args));
    }

    visitLiteralArray(ast: LiteralArray, context: any): Ast {
        return new LiteralArray(ast.range, ast.sourceRange, this.visitAll(ast.expressions));
    }

    visitLiteralMap(ast: LiteralMap, context: any): Ast {
        return new LiteralMap(ast.range, ast.sourceRange, ast.keys, this.visitAll(ast.values));
    }

    visitBinary(ast: Binary, context: any): Ast {
        return new Binary(
            ast.range, ast.sourceRange, ast.operation, ast.left.visit(this), ast.right.visit(this));
    }

    visitPrefixNot(ast: PrefixNot, context: any): Ast {
        return new PrefixNot(ast.range, ast.sourceRange, ast.expression.visit(this));
    }

    visitNonNullAssert(ast: NonNullAssert, context: any): Ast {
        return new NonNullAssert(ast.range, ast.sourceRange, ast.expression.visit(this));
    }

    visitConditional(ast: Conditional, context: any): Ast {
        return new Conditional(
            ast.range, ast.sourceRange, ast.condition.visit(this), ast.trueExp.visit(this),
            ast.falseExp.visit(this));
    }

    visitPipe(ast: BindingPipe, context: any): Ast {
        return new BindingPipe(
            ast.range, ast.sourceRange, ast.exp.visit(this), ast.name, this.visitAll(ast.args),
            ast.nameSpan);
    }

    visitKeyedRead(ast: KeyedRead, context: any): Ast {
        return new KeyedRead(ast.range, ast.sourceRange, ast.obj.visit(this), ast.key.visit(this));
    }

    visitKeyedWrite(ast: KeyedWrite, context: any): Ast {
        return new KeyedWrite(
            ast.range, ast.sourceRange, ast.obj.visit(this), ast.key.visit(this), ast.value.visit(this));
    }

    visitAll(asts: any[]): any[] {
        const res = [];
        for (let i = 0; i < asts.length; ++i) {
            res[i] = asts[i].visit(this);
        }
        return res;
    }

    visitChain(ast: Chain, context: any): Ast {
        return new Chain(ast.range, ast.sourceRange, this.visitAll(ast.expressions));
    }

    visitQuote(ast: Quote, context: any): Ast {
        return new Quote(
            ast.range, ast.sourceRange, ast.prefix, ast.uninterpretedExpression, ast.location);
    }
}

export class AstMemoryEfficientTransformer implements AstVisitor {
    visitImplicitReceiver(ast: ImplicitReceiver, context: any): Ast { return ast; }

    visitInterpolation(ast: Interpolation, context: any): Interpolation {
        const expressions = this.visitAll(ast.expressions);
        if (expressions !== ast.expressions) {
            return new Interpolation(ast.range, ast.sourceRange, ast.strings, expressions);
        }
        return ast;
    }

    visitLiteralPrimitive(ast: LiteralPrimitive, context: any): Ast { return ast; }

    visitPropertyRead(ast: PropertyRead, context: any): Ast {
        const receiver = ast.receiver.visit(this);
        if (receiver !== ast.receiver) {
            return new PropertyRead(ast.range, ast.sourceRange, receiver, ast.name);
        }
        return ast;
    }

    visitPropertyWrite(ast: PropertyWrite, context: any): Ast {
        const receiver = ast.receiver.visit(this);
        const value = ast.value.visit(this);
        if (receiver !== ast.receiver || value !== ast.value) {
            return new PropertyWrite(ast.range, ast.sourceRange, receiver, ast.name, value);
        }
        return ast;
    }

    visitSafePropertyRead(ast: SafePropertyRead, context: any): Ast {
        const receiver = ast.receiver.visit(this);
        if (receiver !== ast.receiver) {
            return new SafePropertyRead(ast.range, ast.sourceRange, receiver, ast.name);
        }
        return ast;
    }

    visitMethodCall(ast: MethodCall, context: any): Ast {
        const receiver = ast.receiver.visit(this);
        const args = this.visitAll(ast.args);
        if (receiver !== ast.receiver || args !== ast.args) {
            return new MethodCall(ast.range, ast.sourceRange, receiver, ast.name, args);
        }
        return ast;
    }

    visitSafeMethodCall(ast: SafeMethodCall, context: any): Ast {
        const receiver = ast.receiver.visit(this);
        const args = this.visitAll(ast.args);
        if (receiver !== ast.receiver || args !== ast.args) {
            return new SafeMethodCall(ast.range, ast.sourceRange, receiver, ast.name, args);
        }
        return ast;
    }

    visitFunctionCall(ast: FunctionCall, context: any): Ast {
        const target = ast.target && ast.target.visit(this);
        const args = this.visitAll(ast.args);
        if (target !== ast.target || args !== ast.args) {
            return new FunctionCall(ast.range, ast.sourceRange, target, args);
        }
        return ast;
    }

    visitLiteralArray(ast: LiteralArray, context: any): Ast {
        const expressions = this.visitAll(ast.expressions);
        if (expressions !== ast.expressions) {
            return new LiteralArray(ast.range, ast.sourceRange, expressions);
        }
        return ast;
    }

    visitLiteralMap(ast: LiteralMap, context: any): Ast {
        const values = this.visitAll(ast.values);
        if (values !== ast.values) {
            return new LiteralMap(ast.range, ast.sourceRange, ast.keys, values);
        }
        return ast;
    }

    visitBinary(ast: Binary, context: any): Ast {
        const left = ast.left.visit(this);
        const right = ast.right.visit(this);
        if (left !== ast.left || right !== ast.right) {
            return new Binary(ast.range, ast.sourceRange, ast.operation, left, right);
        }
        return ast;
    }

    visitPrefixNot(ast: PrefixNot, context: any): Ast {
        const expression = ast.expression.visit(this);
        if (expression !== ast.expression) {
            return new PrefixNot(ast.range, ast.sourceRange, expression);
        }
        return ast;
    }

    visitNonNullAssert(ast: NonNullAssert, context: any): Ast {
        const expression = ast.expression.visit(this);
        if (expression !== ast.expression) {
            return new NonNullAssert(ast.range, ast.sourceRange, expression);
        }
        return ast;
    }

    visitConditional(ast: Conditional, context: any): Ast {
        const condition = ast.condition.visit(this);
        const trueExp = ast.trueExp.visit(this);
        const falseExp = ast.falseExp.visit(this);
        if (condition !== ast.condition || trueExp !== ast.trueExp || falseExp !== ast.falseExp) {
            return new Conditional(ast.range, ast.sourceRange, condition, trueExp, falseExp);
        }
        return ast;
    }

    visitPipe(ast: BindingPipe, context: any): Ast {
        const exp = ast.exp.visit(this);
        const args = this.visitAll(ast.args);
        if (exp !== ast.exp || args !== ast.args) {
            return new BindingPipe(ast.range, ast.sourceRange, exp, ast.name, args, ast.nameSpan);
        }
        return ast;
    }

    visitKeyedRead(ast: KeyedRead, context: any): Ast {
        const obj = ast.obj.visit(this);
        const key = ast.key.visit(this);
        if (obj !== ast.obj || key !== ast.key) {
            return new KeyedRead(ast.range, ast.sourceRange, obj, key);
        }
        return ast;
    }

    visitKeyedWrite(ast: KeyedWrite, context: any): Ast {
        const obj = ast.obj.visit(this);
        const key = ast.key.visit(this);
        const value = ast.value.visit(this);
        if (obj !== ast.obj || key !== ast.key || value !== ast.value) {
            return new KeyedWrite(ast.range, ast.sourceRange, obj, key, value);
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

    visitChain(ast: Chain, context: any): Ast {
        const expressions = this.visitAll(ast.expressions);
        if (expressions !== ast.expressions) {
            return new Chain(ast.range, ast.sourceRange, expressions);
        }
        return ast;
    }

    visitQuote(ast: Quote, context: any): Ast { return ast; }
}

export function visitAstChildren(ast: Ast, visitor: AstVisitor, context?: any) {
    function visit(ast: Ast) {
        visitor.visit && visitor.visit(ast, context) || ast.visit(visitor, context);
    }

    function visitAll<T extends Ast>(asts: T[]) { asts.forEach(visit); }

    ast.visit({
        visitBinary(ast) {
            visit(ast.left);
            visit(ast.right);
        },
        visitChain(ast) { visitAll(ast.expressions); },
        visitConditional(ast) {
            visit(ast.condition);
            visit(ast.trueExp);
            visit(ast.falseExp);
        },
        visitFunctionCall(ast) {
            if (ast.target) {
                visit(ast.target);
            }
            visitAll(ast.args);
        },
        visitImplicitReceiver(ast) { },
        visitInterpolation(ast) { visitAll(ast.expressions); },
        visitKeyedRead(ast) {
            visit(ast.obj);
            visit(ast.key);
        },
        visitKeyedWrite(ast) {
            visit(ast.obj);
            visit(ast.key);
            visit(ast.obj);
        },
        visitLiteralArray(ast) { visitAll(ast.expressions); },
        visitLiteralMap(ast) { },
        visitLiteralPrimitive(ast) { },
        visitMethodCall(ast) {
            visit(ast.receiver);
            visitAll(ast.args);
        },
        visitPipe(ast) {
            visit(ast.exp);
            visitAll(ast.args);
        },
        visitPrefixNot(ast) { visit(ast.expression); },
        visitNonNullAssert(ast) { visit(ast.expression); },
        visitPropertyRead(ast) { visit(ast.receiver); },
        visitPropertyWrite(ast) {
            visit(ast.receiver);
            visit(ast.value);
        },
        visitQuote(ast) { },
        visitSafeMethodCall(ast) {
            visit(ast.receiver);
            visitAll(ast.args);
        },
        visitSafePropertyRead(ast) { visit(ast.receiver); },
    });
}
