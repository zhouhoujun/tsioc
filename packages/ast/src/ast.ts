
import { ObjectMap, Injectable, InjectToken, Abstract, IContainer, ContainerToken, Inject } from '@ts-ioc/core';

@Injectable()
export class AstSpan {
    constructor(public start: number, public end: number) {
    }
}


export const AstContextToken = new InjectToken<AstContext>('__AST_AstContext');
export interface AstContext extends ObjectMap<any> {
}

export const ASTToken = new InjectToken<AST>('__AST_ASTToken');

@Abstract()
export abstract class AST {
    astType: string;
    constructor(public span: AstSpan) {
    }
    abstract visit(visitor: AstVisitor, context: any);

    toString(): string {
        return 'AST';
    }
}

@Injectable(ASTToken, 'Quote')
export class Quote extends AST {
    constructor(
        span: AstSpan, public prefix: string, public uninterpretedExpression: string,
        public location: any) {
        super(span);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visit(this, context);
    }
    toString(): string { return 'Quote'; }
}

export type LiteralMapKey = {
    key: string; quoted: boolean;
};

@Injectable(ASTToken, 'LiteralMap')
export class LiteralMap extends AST {
    constructor(span: AstSpan, public keys: LiteralMapKey[], public values: any[]) {
         super(span);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visit(this, context);
    }
}

export const AstVisitorToken = new InjectToken<AstVisitor>('__AST_AstVisitor');
export interface AstVisitor {
    visit(ast: AST, context: AstContext);
}

