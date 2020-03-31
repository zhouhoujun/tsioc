import { Type } from '@tsdi/ioc';
import { ParseLocation } from '../source';



export abstract class Expression {
    public type: Type|null;
    public sourceSpan: ParseLocation|null;
  
    constructor(type: Type|null|undefined, sourceSpan?: ParseLocation|null) {
      this.type = type || null;
      this.sourceSpan = sourceSpan || null;
    }
  
    abstract visitExpression(visitor: ExpressionVisitor, context: any): any;
  
    /**
     * Calculates whether this expression produces the same value as the given expression.
     * Note: We don't check Types nor ParseSourceSpans nor function arguments.
     */
    abstract isEquivalent(e: Expression): boolean;
  
    /**
     * Return true if the expression is constant.
     */
    abstract isConstant(): boolean;
  
    prop(name: string, sourceSpan?: ParseSourceSpan|null): ReadPropExpr {
      return new ReadPropExpr(this, name, null, sourceSpan);
    }
  
    key(index: Expression, type?: Type|null, sourceSpan?: ParseSourceSpan|null): ReadKeyExpr {
      return new ReadKeyExpr(this, index, type, sourceSpan);
    }
  
    callMethod(name: string|BuiltinMethod, params: Expression[], sourceSpan?: ParseSourceSpan|null):
        InvokeMethodExpr {
      return new InvokeMethodExpr(this, name, params, null, sourceSpan);
    }
  
    callFn(params: Expression[], sourceSpan?: ParseSourceSpan|null): InvokeFunctionExpr {
      return new InvokeFunctionExpr(this, params, null, sourceSpan);
    }
  
    instantiate(params: Expression[], type?: Type|null, sourceSpan?: ParseSourceSpan|null):
        InstantiateExpr {
      return new InstantiateExpr(this, params, type, sourceSpan);
    }
  
    conditional(
        trueCase: Expression, falseCase: Expression|null = null,
        sourceSpan?: ParseSourceSpan|null): ConditionalExpr {
      return new ConditionalExpr(this, trueCase, falseCase, null, sourceSpan);
    }
  
    equals(rhs: Expression, sourceSpan?: ParseSourceSpan|null): BinaryOperatorExpr {
      return new BinaryOperatorExpr(BinaryOperator.Equals, this, rhs, null, sourceSpan);
    }
    notEquals(rhs: Expression, sourceSpan?: ParseSourceSpan|null): BinaryOperatorExpr {
      return new BinaryOperatorExpr(BinaryOperator.NotEquals, this, rhs, null, sourceSpan);
    }
    identical(rhs: Expression, sourceSpan?: ParseSourceSpan|null): BinaryOperatorExpr {
      return new BinaryOperatorExpr(BinaryOperator.Identical, this, rhs, null, sourceSpan);
    }
    notIdentical(rhs: Expression, sourceSpan?: ParseSourceSpan|null): BinaryOperatorExpr {
      return new BinaryOperatorExpr(BinaryOperator.NotIdentical, this, rhs, null, sourceSpan);
    }
    minus(rhs: Expression, sourceSpan?: ParseSourceSpan|null): BinaryOperatorExpr {
      return new BinaryOperatorExpr(BinaryOperator.Minus, this, rhs, null, sourceSpan);
    }
    plus(rhs: Expression, sourceSpan?: ParseSourceSpan|null): BinaryOperatorExpr {
      return new BinaryOperatorExpr(BinaryOperator.Plus, this, rhs, null, sourceSpan);
    }
    divide(rhs: Expression, sourceSpan?: ParseSourceSpan|null): BinaryOperatorExpr {
      return new BinaryOperatorExpr(BinaryOperator.Divide, this, rhs, null, sourceSpan);
    }
    multiply(rhs: Expression, sourceSpan?: ParseSourceSpan|null): BinaryOperatorExpr {
      return new BinaryOperatorExpr(BinaryOperator.Multiply, this, rhs, null, sourceSpan);
    }
    modulo(rhs: Expression, sourceSpan?: ParseSourceSpan|null): BinaryOperatorExpr {
      return new BinaryOperatorExpr(BinaryOperator.Modulo, this, rhs, null, sourceSpan);
    }
    and(rhs: Expression, sourceSpan?: ParseSourceSpan|null): BinaryOperatorExpr {
      return new BinaryOperatorExpr(BinaryOperator.And, this, rhs, null, sourceSpan);
    }
    bitwiseAnd(rhs: Expression, sourceSpan?: ParseSourceSpan|null, parens: boolean = true):
        BinaryOperatorExpr {
      return new BinaryOperatorExpr(BinaryOperator.BitwiseAnd, this, rhs, null, sourceSpan, parens);
    }
    or(rhs: Expression, sourceSpan?: ParseSourceSpan|null): BinaryOperatorExpr {
      return new BinaryOperatorExpr(BinaryOperator.Or, this, rhs, null, sourceSpan);
    }
    lower(rhs: Expression, sourceSpan?: ParseSourceSpan|null): BinaryOperatorExpr {
      return new BinaryOperatorExpr(BinaryOperator.Lower, this, rhs, null, sourceSpan);
    }
    lowerEquals(rhs: Expression, sourceSpan?: ParseSourceSpan|null): BinaryOperatorExpr {
      return new BinaryOperatorExpr(BinaryOperator.LowerEquals, this, rhs, null, sourceSpan);
    }
    bigger(rhs: Expression, sourceSpan?: ParseSourceSpan|null): BinaryOperatorExpr {
      return new BinaryOperatorExpr(BinaryOperator.Bigger, this, rhs, null, sourceSpan);
    }
    biggerEquals(rhs: Expression, sourceSpan?: ParseSourceSpan|null): BinaryOperatorExpr {
      return new BinaryOperatorExpr(BinaryOperator.BiggerEquals, this, rhs, null, sourceSpan);
    }
    isBlank(sourceSpan?: ParseSourceSpan|null): Expression {
      // Note: We use equals by purpose here to compare to null and undefined in JS.
      // We use the typed null to allow strictNullChecks to narrow types.
      return this.equals(TYPED_NULL_EXPR, sourceSpan);
    }
    cast(type: Type, sourceSpan?: ParseSourceSpan|null): Expression {
      return new CastExpr(this, type, sourceSpan);
    }
  
    toStmt(): Statement { return new ExpressionStatement(this, null); }
  }
  