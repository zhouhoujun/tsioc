
import { ObjectMap, Injectable, InjectToken, Abstract, IContainer, ContainerToken, Inject } from '@ts-ioc/core';
import { Ast } from './decorators/Ast';

@Injectable()
export class AstSpan {
    constructor(public start: number, public end: number) {
    }
}


export const AstContextToken = new InjectToken<AstContext>('__AST_AstContext');
export interface AstContext extends ObjectMap<any> {
}

export const ASTToken = new InjectToken<AST>('__AST_ASTToken');

@Ast(ASTToken)
export class AST {
    astType: string;
    constructor(public span: AstSpan) {
    }

    visit(visitor: AstVisitor, context: any) {
        return visitor.visit(this, context);
    }

    toString(): string {
        return `AST_${this.astType || ''}`;
    }
}

@Ast(ASTToken, 'Quote')
export class Quote extends AST {
    constructor(
        span: AstSpan, public prefix: string, public uninterpretedExpression: string,
        public location: any) {
        super(span);
    }
}

@Ast(ASTToken, 'EmptyExpr')
export class EmptyExpr extends AST {
    visit(visitor: AstVisitor, context: any = null) {
    }
}

@Ast(ASTToken, 'ImplicitReceiver')
export class ImplicitReceiver extends AST {

}

@Ast(ASTToken, 'Chain')
export class Chain extends AST {
    constructor(span: AstSpan, public expressions: any[]) {
        super(span);
    }
}

@Ast(ASTToken, 'Conditional')
export class Conditional extends AST {
    constructor(span: AstSpan, public condition: AST, public trueExp: AST, public falseExp: AST) {
        super(span);
    }
}

@Ast(ASTToken, 'PropertyRead')
export class PropertyRead extends AST {
    constructor(span: AstSpan, public receiver: AST, public name: string) {
        super(span);
    }
}

@Ast(ASTToken, 'PropertyWrite')
export class PropertyWrite extends AST {
    constructor(span: AstSpan, public receiver: AST, public name: string, public value: AST) {
        super(span);
    }
}

@Ast(ASTToken, 'SafePropertyRead')
export class SafePropertyRead extends AST {
    constructor(span: AstSpan, public receiver: AST, public name: string) {
        super(span);
    }
}

@Ast(ASTToken, 'KeyedRead')
export class KeyedRead extends AST {
    constructor(span: AstSpan, public obj: AST, public key: AST) {
        super(span);
    }
}
@Ast(ASTToken, 'KeyedWrite')
export class KeyedWrite extends AST {
    constructor(span: AstSpan, public obj: AST, public key: AST, public value: AST) {
        super(span);
    }
}

@Ast(ASTToken, 'BindingPipe')
export class BindingPipe extends AST {
    constructor(span: AstSpan, public exp: AST, public name: string, public args: any[]) {
        super(span);
    }
}

@Ast(ASTToken, 'LiteralPrimitive')
export class LiteralPrimitive extends AST {
    constructor(span: AstSpan, public value: any) {
        super(span);
    }
}

@Ast(ASTToken, 'LiteralArray')
export class LiteralArray extends AST {
    constructor(span: AstSpan, public expressions: any[]) {
        super(span);
    }
}

export type LiteralMapKey = {
    key: string; quoted: boolean;
};

@Ast(ASTToken, 'LiteralMap')
export class LiteralMap extends AST {
    constructor(span: AstSpan, public keys: LiteralMapKey[], public values: any[]) {
        super(span);
    }
}

@Ast(ASTToken, 'Interpolation')
export class Interpolation extends AST {
    constructor(span: AstSpan, public strings: any[], public expressions: any[]) {
        super(span);
    }
}

@Ast(ASTToken, 'Binary')
export class Binary extends AST {
    constructor(span: AstSpan, public operation: string, public left: AST, public right: AST) {
        super(span);
    }
}

@Ast(ASTToken, 'PrefixNot')
export class PrefixNot extends AST {
    constructor(span: AstSpan, public expression: AST) {
        super(span);
    }
}

@Ast(ASTToken, 'NonNullAssert')
export class NonNullAssert extends AST {
    constructor(span: AstSpan, public expression: AST) {
        super(span);
    }
}

@Ast(ASTToken, 'MethodCall')
export class MethodCall extends AST {
    constructor(span: AstSpan, public receiver: AST, public name: string, public args: any[]) {
        super(span);
    }
}

@Ast(ASTToken, 'SafeMethodCall')
export class SafeMethodCall extends AST {
    constructor(span: AstSpan, public receiver: AST, public name: string, public args: any[]) {
        super(span);
    }
}

@Ast(ASTToken, 'FunctionCall')
export class FunctionCall extends AST {
    constructor(span: AstSpan, public target: AST | null, public args: any[]) {
        super(span);
    }
}

export const AstVisitorToken = new InjectToken<AstVisitor>('__AST_AstVisitor');
export interface AstVisitor {
    visit(ast: AST, context: AstContext);
}

@Injectable(AstVisitorToken, 'Null')
export class NullAstVisitor implements AstVisitor {
    visit(ast: AST, context: AstContext) {

    }
}

@Injectable(AstVisitorToken, 'Recursive')
export class RecursiveAstVisitor implements AstVisitor {
    @Inject(ContainerToken)
    container: IContainer;
    constructor() {
    }
    visit(ast: AST, context: AstContext) {
        return this[`visit${ast.astType}`].apply(this, [ast, context]);
    }
}
