/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
    ParserError, AstSource, Quote, CodeRange, FunctionCall, NonNullAssert, Ast,
    TemplateBinding, SourceRange, Chain, BindingPipe, Conditional, EmptyExpr, Binary,
    LiteralPrimitive, PrefixNot, KeyedWrite, KeyedRead, ImplicitReceiver, LiteralArray,
    LiteralMap, LiteralMapKey, SafeMethodCall, MethodCall, PropertyWrite, PropertyRead,
    SafePropertyRead, AstVisitor, Interpolation
} from './ast';
import { chars, Lexer, Tokenize, EOF, TokenType, isQuote, isIdentifier } from './lexer';
import { escapeRegExp } from './utils';
import { InterpolationConfig, DEFAULT_INTERPOLATION_CONFIG } from './interpolation';

export class SplitInterpolation {
    constructor(public strings: string[], public expressions: string[], public offsets: number[]) { }
}

export class TemplateBindingParseResult {
    constructor(
        public templateBindings: TemplateBinding[], public warnings: string[],
        public errors: ParserError[]) { }
}

function _createInterpolateRegExp(config: InterpolationConfig): RegExp {
    const pattern = escapeRegExp(config.start) + '([\\s\\S]*?)' + escapeRegExp(config.end);
    return new RegExp(pattern, 'g');
}

export class Parser {
    private errors: ParserError[] = [];

    constructor(private lexer: Lexer) {

    }

    parseAction(
        input: string, location: any, absoluteOffset: number,
        interpolationConfig: InterpolationConfig = DEFAULT_INTERPOLATION_CONFIG): AstSource {
        this._checkNoInterpolation(input, location, interpolationConfig);
        const sourceToLex = this._stripComments(input);
        const tokens = this.lexer.tokenize(this._stripComments(input));
        const ast = new ParseAST(
            input, location, absoluteOffset, tokens, sourceToLex.length, true, this.errors,
            input.length - sourceToLex.length)
            .parseChain();
        return new AstSource(ast, input, location, absoluteOffset, this.errors);
    }

    parseBinding(
        input: string, location: any, absoluteOffset: number,
        interpolationConfig: InterpolationConfig = DEFAULT_INTERPOLATION_CONFIG): AstSource {
        const ast = this._parseBindingAst(input, location, absoluteOffset, interpolationConfig);
        return new AstSource(ast, input, location, absoluteOffset, this.errors);
    }

    parseSimpleBinding(
        input: string, location: string, absoluteOffset: number,
        interpolationConfig: InterpolationConfig = DEFAULT_INTERPOLATION_CONFIG): AstSource {
        const ast = this._parseBindingAst(input, location, absoluteOffset, interpolationConfig);
        const errors = SimpleExpressionChecker.check(ast);
        if (errors.length > 0) {
            this._reportError(
                `Host binding expression cannot contain ${errors.join(' ')}`, input, location);
        }
        return new AstSource(ast, input, location, absoluteOffset, this.errors);
    }


    private _reportError(message: string, input: string, errLocation: string, ctxLocation?: any) {
        this.errors.push(new ParserError(message, input, errLocation, ctxLocation));
    }

    private _parseBindingAst(
        input: string, location: string, absoluteOffset: number,
        interpolationConfig: InterpolationConfig): Ast {
        // Quotes expressions use 3rd-party expression language. We don't want to use
        // our lexer or parser for that, so we check for that ahead of time.
        const quote = this._parseQuote(input, location, absoluteOffset);

        if (quote != null) {
            return quote;
        }

        this._checkNoInterpolation(input, location, interpolationConfig);
        const sourceToLex = this._stripComments(input);
        const tokens = this.lexer.tokenize(sourceToLex);
        return new ParseAST(
            input, location, absoluteOffset, tokens, sourceToLex.length, false, this.errors,
            input.length - sourceToLex.length)
            .parseChain();
    }

    private _parseQuote(input: string | null, location: any, absoluteOffset: number): Ast | null {
        if (input == null) {
            return null;
        }
        const prefixSeparatorIndex = input.indexOf(':');
        if (prefixSeparatorIndex === -1) {
            return null;
        }
        const prefix = input.substring(0, prefixSeparatorIndex).trim();
        if (!isIdentifier(prefix)) {
            return null;
        }
        const uninterpretedExpression = input.substring(prefixSeparatorIndex + 1);
        const span = new CodeRange(0, input.length);
        return new Quote(
            span, span.offset(absoluteOffset), prefix, uninterpretedExpression, location);
    }


    parseTemplateBindings(tplKey: string, tplValue: string, location: any, absoluteOffset: number):
        TemplateBindingParseResult {
        const tokens = this.lexer.tokenize(tplValue);
        return new ParseAST(
            tplValue, location, absoluteOffset, tokens, tplValue.length, false, this.errors, 0)
            .parseTemplateBindings(tplKey);
    }

    parseInterpolation(
        input: string, location: any, absoluteOffset: number,
        interpolationConfig: InterpolationConfig = DEFAULT_INTERPOLATION_CONFIG): AstSource | null {
        const split = this.splitInterpolation(input, location, interpolationConfig);
        if (split == null) {
            return null;
        }

        const expressions: Ast[] = [];

        for (let i = 0; i < split.expressions.length; ++i) {
            const expressionText = split.expressions[i];
            const sourceToLex = this._stripComments(expressionText);
            const tokens = this.lexer.tokenize(sourceToLex);
            const ast = new ParseAST(
                input, location, absoluteOffset, tokens, sourceToLex.length, false,
                this.errors, split.offsets[i] + (expressionText.length - sourceToLex.length))
                .parseChain();
            expressions.push(ast);
        }

        const range = new CodeRange(0, input == null ? 0 : input.length);
        return new AstSource(
            new Interpolation(range, range.offset(absoluteOffset), split.strings, expressions), input,
            location, absoluteOffset, this.errors);
    }

    splitInterpolation(
        input: string, location: string,
        interpolationConfig: InterpolationConfig = DEFAULT_INTERPOLATION_CONFIG): SplitInterpolation
        | null {
        const regexp = _createInterpolateRegExp(interpolationConfig);
        const parts = input.split(regexp);
        if (parts.length <= 1) {
            return null;
        }
        const strings: string[] = [];
        const expressions: string[] = [];
        const offsets: number[] = [];
        let offset = 0;
        for (let i = 0; i < parts.length; i++) {
            const part: string = parts[i];
            if (i % 2 === 0) {
                // fixed string
                strings.push(part);
                offset += part.length;
            } else if (part.trim().length > 0) {
                offset += interpolationConfig.start.length;
                expressions.push(part);
                offsets.push(offset);
                offset += part.length + interpolationConfig.end.length;
            } else {
                this._reportError(
                    'Blank expressions are not allowed in interpolated strings', input,
                    `at column ${this._findInterpolationErrorColumn(parts, i, interpolationConfig)} in`,
                    location);
                expressions.push('$implict');
                offsets.push(offset);
            }
        }
        return new SplitInterpolation(strings, expressions, offsets);
    }

    wrapLiteralPrimitive(input: string | null, location: any, absoluteOffset: number): AstSource {
        const span = new CodeRange(0, input == null ? 0 : input.length);
        return new AstSource(
            new LiteralPrimitive(span, span.offset(absoluteOffset), input), input, location,
            absoluteOffset, this.errors);
    }

    private _stripComments(input: string): string {
        const i = this._commentStart(input);
        return i != null ? input.substring(0, i).trim() : input;
    }

    private _commentStart(input: string): number | null {
        let outerQuote: number | null = null;
        for (let i = 0; i < input.length - 1; i++) {
            const char = input.charCodeAt(i);
            const nextChar = input.charCodeAt(i + 1);

            if (char === chars.$SLASH && nextChar === chars.$SLASH && outerQuote == null) {
                return i;
            }

            if (outerQuote === char) {
                outerQuote = null;
            } else if (outerQuote == null && isQuote(char)) {
                outerQuote = char;
            }
        }
        return null;
    }

    private _checkNoInterpolation(
        input: string, location: any, interpolationConfig: InterpolationConfig): void {
        const regexp = _createInterpolateRegExp(interpolationConfig);
        const parts = input.split(regexp);
        if (parts.length > 1) {
            this._reportError(
                `Got interpolation (${interpolationConfig.start}${interpolationConfig.end}) where expression was expected`,
                input,
                `at column ${this._findInterpolationErrorColumn(parts, 1, interpolationConfig)} in`,
                location);
        }
    }

    private _findInterpolationErrorColumn(
        parts: string[], partInErrIdx: number, interpolationConfig: InterpolationConfig): number {
        let errLocation = '';
        for (let j = 0; j < partInErrIdx; j++) {
            errLocation += j % 2 === 0 ?
                parts[j] :
                `${interpolationConfig.start}${parts[j]}${interpolationConfig.end}`;
        }

        return errLocation.length;
    }
}


export class ParseAST {
    private rparensExpected = 0;
    private rbracketsExpected = 0;
    private rbracesExpected = 0;

    // Cache of expression start and input indeces to the absolute source span they map to, used to
    // prevent creating superfluous source spans in `sourceSpan`.
    // A serial of the expression start and input index is used for mapping because both are stateful
    // and may change for subsequent expressions visited by the parser.
    private sourceSpanCache = new Map<string, SourceRange>();

    index = 0;

    constructor(
        public input: string, public location: any, public absoluteOffset: number,
        public tokens: Tokenize[], public inputLength: number, public parseAction: boolean,
        private errors: ParserError[], private offset: number) { }

    peek(offset: number): Tokenize {
        const i = this.index + offset;
        return i < this.tokens.length ? this.tokens[i] : EOF;
    }

    get next(): Tokenize { return this.peek(0); }

    get inputIndex(): number {
        return (this.index < this.tokens.length) ? this.next.index + this.offset :
            this.inputLength + this.offset;
    }

    range(start: number) { return new CodeRange(start, this.inputIndex); }

    sourceRange(start: number): SourceRange {
        const serial = `${start}@${this.inputIndex}`;
        if (!this.sourceSpanCache.has(serial)) {
            this.sourceSpanCache.set(serial, this.range(start).offset(this.absoluteOffset));
        }
        return this.sourceSpanCache.get(serial)!;
    }

    advance() { this.index++; }

    optionalCharacter(code: number): boolean {
        if (this.next.isCharacter(code)) {
            this.advance();
            return true;
        } else {
            return false;
        }
    }

    peekKeywordLet(): boolean { return this.next.isKeywordLet(); }
    peekKeywordAs(): boolean { return this.next.isKeywordAs(); }

    expectCharacter(code: number) {
        if (this.optionalCharacter(code)) {
            return;
        }
        this.error(`Missing expected ${String.fromCharCode(code)}`);
    }

    optionalOperator(op: string): boolean {
        if (this.next.isOperator(op)) {
            this.advance();
            return true;
        } else {
            return false;
        }
    }

    expectOperator(operator: string) {
        if (this.optionalOperator(operator)) {
            return;
        }
        this.error(`Missing expected operator ${operator}`);
    }

    expectIdentifierOrKeyword(): string {
        const n = this.next;
        if (!n.isIdentifier() && !n.isKeyword()) {
            this.error(`Unexpected token ${n}, expected identifier or keyword`);
            return '';
        }
        this.advance();
        return n.toString() as string;
    }

    expectIdentifierOrKeywordOrString(): string {
        const n = this.next;
        if (!n.isIdentifier() && !n.isKeyword() && !n.isString()) {
            this.error(`Unexpected token ${n}, expected identifier, keyword, or string`);
            return '';
        }
        this.advance();
        return n.toString() as string;
    }

    parseChain(): Ast {
        const exprs: Ast[] = [];
        const start = this.inputIndex;
        while (this.index < this.tokens.length) {
            const expr = this.parsePipe();
            exprs.push(expr);

            if (this.optionalCharacter(chars.$SEMICOLON)) {
                if (!this.parseAction) {
                    this.error('Binding expression cannot contain chained expression');
                }
                while (this.optionalCharacter(chars.$SEMICOLON)) {
                }  // read all semicolons
            } else if (this.index < this.tokens.length) {
                this.error(`Unexpected token '${this.next}'`);
            }
        }
        if (exprs.length === 0) {
            return new EmptyExpr(this.range(start), this.sourceRange(start));
        }
        if (exprs.length === 1) {
            return exprs[0];
        }
        return new Chain(this.range(start), this.sourceRange(start), exprs);
    }

    parsePipe(): Ast {
        let result = this.parseExpression();
        if (this.optionalOperator('|')) {
            if (this.parseAction) {
                this.error('Cannot have a pipe in an action expression');
            }

            do {
                const nameStart = this.inputIndex;
                const name = this.expectIdentifierOrKeyword();
                const nameSpan = this.range(nameStart);
                const args: Ast[] = [];
                while (this.optionalCharacter(chars.$COLON)) {
                    args.push(this.parseExpression());
                }
                const { start } = result.range;
                result =
                    new BindingPipe(this.range(start), this.sourceRange(start), result, name, args, nameSpan);
            } while (this.optionalOperator('|'));
        }

        return result;
    }

    parseExpression(): Ast { return this.parseConditional(); }

    parseConditional(): Ast {
        const start = this.inputIndex;
        const result = this.parseLogicalOr();

        if (this.optionalOperator('?')) {
            const yes = this.parsePipe();
            let no: Ast;
            if (!this.optionalCharacter(chars.$COLON)) {
                const end = this.inputIndex;
                const expression = this.input.substring(start, end);
                this.error(`Conditional expression ${expression} requires all 3 expressions`);
                no = new EmptyExpr(this.range(start), this.sourceRange(start));
            } else {
                no = this.parsePipe();
            }
            return new Conditional(this.range(start), this.sourceRange(start), result, yes, no);
        } else {
            return result;
        }
    }

    parseLogicalOr(): Ast {
        // '||'
        let result = this.parseLogicalAnd();
        while (this.optionalOperator('||')) {
            const right = this.parseLogicalAnd();
            const { start } = result.range;
            result = new Binary(this.range(start), this.sourceRange(start), '||', result, right);
        }
        return result;
    }

    parseLogicalAnd(): Ast {
        // '&&'
        let result = this.parseEquality();
        while (this.optionalOperator('&&')) {
            const right = this.parseEquality();
            const { start } = result.range;
            result = new Binary(this.range(start), this.sourceRange(start), '&&', result, right);
        }
        return result;
    }

    parseEquality(): Ast {
        // '==','!=','===','!=='
        let result = this.parseRelational();
        while (this.next.type === TokenType.Operator) {
            const operator = this.next.strValue;
            switch (operator) {
                case '==':
                case '===':
                case '!=':
                case '!==':
                    this.advance();
                    const right = this.parseRelational();
                    const { start } = result.range;
                    result = new Binary(this.range(start), this.sourceRange(start), operator, result, right);
                    continue;
            }
            break;
        }
        return result;
    }

    parseRelational(): Ast {
        // '<', '>', '<=', '>='
        let result = this.parseAdditive();
        while (this.next.type === TokenType.Operator) {
            const operator = this.next.strValue;
            switch (operator) {
                case '<':
                case '>':
                case '<=':
                case '>=':
                    this.advance();
                    const right = this.parseAdditive();
                    const { start } = result.range;
                    result = new Binary(this.range(start), this.sourceRange(start), operator, result, right);
                    continue;
            }
            break;
        }
        return result;
    }

    parseAdditive(): Ast {
        // '+', '-'
        let result = this.parseMultiplicative();
        while (this.next.type === TokenType.Operator) {
            const operator = this.next.strValue;
            switch (operator) {
                case '+':
                case '-':
                    this.advance();
                    let right = this.parseMultiplicative();
                    const { start } = result.range;
                    result = new Binary(this.range(start), this.sourceRange(start), operator, result, right);
                    continue;
            }
            break;
        }
        return result;
    }

    parseMultiplicative(): Ast {
        // '*', '%', '/'
        let result = this.parsePrefix();
        while (this.next.type === TokenType.Operator) {
            const operator = this.next.strValue;
            switch (operator) {
                case '*':
                case '%':
                case '/':
                    this.advance();
                    let right = this.parsePrefix();
                    const { start } = result.range;
                    result = new Binary(this.range(start), this.sourceRange(start), operator, result, right);
                    continue;
            }
            break;
        }
        return result;
    }

    parsePrefix(): Ast {
        if (this.next.type === TokenType.Operator) {
            const start = this.inputIndex;
            const operator = this.next.strValue;
            const literalSpan = new CodeRange(start, start);
            const literalSourceSpan = literalSpan.offset(this.absoluteOffset);
            let result: Ast;
            switch (operator) {
                case '+':
                    this.advance();
                    result = this.parsePrefix();
                    return new Binary(
                        this.range(start), this.sourceRange(start), '-', result,
                        new LiteralPrimitive(literalSpan, literalSourceSpan, 0));
                case '-':
                    this.advance();
                    result = this.parsePrefix();
                    return new Binary(
                        this.range(start), this.sourceRange(start), operator,
                        new LiteralPrimitive(literalSpan, literalSourceSpan, 0), result);
                case '!':
                    this.advance();
                    result = this.parsePrefix();
                    return new PrefixNot(this.range(start), this.sourceRange(start), result);
            }
        }
        return this.parseCallChain();
    }

    parseCallChain(): Ast {
        let result = this.parsePrimary();
        const resultStart = result.range.start;
        while (true) {
            if (this.optionalCharacter(chars.$PERIOD)) {
                result = this.parseAccessMemberOrMethodCall(result, false);

            } else if (this.optionalOperator('?.')) {
                result = this.parseAccessMemberOrMethodCall(result, true);

            } else if (this.optionalCharacter(chars.$LBRACKET)) {
                this.rbracketsExpected++;
                const key = this.parsePipe();
                this.rbracketsExpected--;
                this.expectCharacter(chars.$RBRACKET);
                if (this.optionalOperator('=')) {
                    const value = this.parseConditional();
                    result = new KeyedWrite(
                        this.range(resultStart), this.sourceRange(resultStart), result, key, value);
                } else {
                    result = new KeyedRead(this.range(resultStart), this.sourceRange(resultStart), result, key);
                }

            } else if (this.optionalCharacter(chars.$LPAREN)) {
                this.rparensExpected++;
                const args = this.parseCallArguments();
                this.rparensExpected--;
                this.expectCharacter(chars.$RPAREN);
                result =
                    new FunctionCall(this.range(resultStart), this.sourceRange(resultStart), result, args);

            } else if (this.optionalOperator('!')) {
                result = new NonNullAssert(this.range(resultStart), this.sourceRange(resultStart), result);

            } else {
                return result;
            }
        }
    }

    parsePrimary(): Ast {
        const start = this.inputIndex;
        if (this.optionalCharacter(chars.$LPAREN)) {
            this.rparensExpected++;
            const result = this.parsePipe();
            this.rparensExpected--;
            this.expectCharacter(chars.$RPAREN);
            return result;

        } else if (this.next.isKeywordNull()) {
            this.advance();
            return new LiteralPrimitive(this.range(start), this.sourceRange(start), null);

        } else if (this.next.isKeywordUndefined()) {
            this.advance();
            return new LiteralPrimitive(this.range(start), this.sourceRange(start), void 0);

        } else if (this.next.isKeywordTrue()) {
            this.advance();
            return new LiteralPrimitive(this.range(start), this.sourceRange(start), true);

        } else if (this.next.isKeywordFalse()) {
            this.advance();
            return new LiteralPrimitive(this.range(start), this.sourceRange(start), false);

        } else if (this.next.isKeywordThis()) {
            this.advance();
            return new ImplicitReceiver(this.range(start), this.sourceRange(start));

        } else if (this.optionalCharacter(chars.$LBRACKET)) {
            this.rbracketsExpected++;
            const elements = this.parseExpressionList(chars.$RBRACKET);
            this.rbracketsExpected--;
            this.expectCharacter(chars.$RBRACKET);
            return new LiteralArray(this.range(start), this.sourceRange(start), elements);

        } else if (this.next.isCharacter(chars.$LBRACE)) {
            return this.parseLiteralMap();

        } else if (this.next.isIdentifier()) {
            return this.parseAccessMemberOrMethodCall(
                new ImplicitReceiver(this.range(start), this.sourceRange(start)), false);

        } else if (this.next.isNumber()) {
            const value = this.next.toNumber();
            this.advance();
            return new LiteralPrimitive(this.range(start), this.sourceRange(start), value);

        } else if (this.next.isString()) {
            const literalValue = this.next.toString();
            this.advance();
            return new LiteralPrimitive(this.range(start), this.sourceRange(start), literalValue);

        } else if (this.index >= this.tokens.length) {
            this.error(`Unexpected end of expression: ${this.input}`);
            return new EmptyExpr(this.range(start), this.sourceRange(start));
        } else {
            this.error(`Unexpected token ${this.next}`);
            return new EmptyExpr(this.range(start), this.sourceRange(start));
        }
    }

    parseExpressionList(terminator: number): Ast[] {
        const result: Ast[] = [];
        if (!this.next.isCharacter(terminator)) {
            do {
                result.push(this.parsePipe());
            } while (this.optionalCharacter(chars.$COMMA));
        }
        return result;
    }

    parseLiteralMap(): LiteralMap {
        const keys: LiteralMapKey[] = [];
        const values: Ast[] = [];
        const start = this.inputIndex;
        this.expectCharacter(chars.$LBRACE);
        if (!this.optionalCharacter(chars.$RBRACE)) {
            this.rbracesExpected++;
            do {
                const quoted = this.next.isString();
                const key = this.expectIdentifierOrKeywordOrString();
                keys.push({ key, quoted });
                this.expectCharacter(chars.$COLON);
                values.push(this.parsePipe());
            } while (this.optionalCharacter(chars.$COMMA));
            this.rbracesExpected--;
            this.expectCharacter(chars.$RBRACE);
        }
        return new LiteralMap(this.range(start), this.sourceRange(start), keys, values);
    }

    parseAccessMemberOrMethodCall(receiver: Ast, isSafe = false): Ast {
        const start = receiver.range.start;
        const id = this.expectIdentifierOrKeyword();

        if (this.optionalCharacter(chars.$LPAREN)) {
            this.rparensExpected++;
            const args = this.parseCallArguments();
            this.expectCharacter(chars.$RPAREN);
            this.rparensExpected--;
            const span = this.range(start);
            const sourceSpan = this.sourceRange(start);
            return isSafe ? new SafeMethodCall(span, sourceSpan, receiver, id, args) :
                new MethodCall(span, sourceSpan, receiver, id, args);

        } else {
            if (isSafe) {
                if (this.optionalOperator('=')) {
                    this.error('The \'?.\' operator cannot be used in the assignment');
                    return new EmptyExpr(this.range(start), this.sourceRange(start));
                } else {
                    return new SafePropertyRead(this.range(start), this.sourceRange(start), receiver, id);
                }
            } else {
                if (this.optionalOperator('=')) {
                    if (!this.parseAction) {
                        this.error('Bindings cannot contain assignments');
                        return new EmptyExpr(this.range(start), this.sourceRange(start));
                    }

                    const value = this.parseConditional();
                    return new PropertyWrite(this.range(start), this.sourceRange(start), receiver, id, value);
                } else {
                    const span = this.range(start);
                    return new PropertyRead(this.range(start), this.sourceRange(start), receiver, id);
                }
            }
        }
    }

    parseCallArguments(): BindingPipe[] {
        if (this.next.isCharacter(chars.$RPAREN)) {
            return [];
        }
        const positionals: Ast[] = [];
        do {
            positionals.push(this.parsePipe());
        } while (this.optionalCharacter(chars.$COMMA));
        return positionals as BindingPipe[];
    }

    /**
     * An identifier, a keyword, a string with an optional `-` in between.
     */
    expectTemplateBindingKey(): string {
        let result = '';
        let operatorFound = false;
        do {
            result += this.expectIdentifierOrKeywordOrString();
            operatorFound = this.optionalOperator('-');
            if (operatorFound) {
                result += '-';
            }
        } while (operatorFound);

        return result.toString();
    }

    // Parses the Ast for `<some-tag *tplKey=Ast>`
    parseTemplateBindings(tplKey: string): TemplateBindingParseResult {
        let firstBinding = true;
        const bindings: TemplateBinding[] = [];
        const warnings: string[] = [];
        do {
            const start = this.inputIndex;
            let rawKey: string;
            let key: string;
            let isVar = false;
            if (firstBinding) {
                rawKey = key = tplKey;
                firstBinding = false;
            } else {
                isVar = this.peekKeywordLet();
                if (isVar) {
                    this.advance();
                }
                rawKey = this.expectTemplateBindingKey();
                key = isVar ? rawKey : tplKey + rawKey[0].toUpperCase() + rawKey.substring(1);
                this.optionalCharacter(chars.$COLON);
            }

            let name: string = null!;
            let expression: AstSource | null = null;
            if (isVar) {
                if (this.optionalOperator('=')) {
                    name = this.expectTemplateBindingKey();
                } else {
                    name = '\$implicit';
                }
            } else if (this.peekKeywordAs()) {
                this.advance();  // consume `as`
                name = rawKey;
                key = this.expectTemplateBindingKey();  // read local var name
                isVar = true;
            } else if (this.next !== EOF && !this.peekKeywordLet()) {
                const start = this.inputIndex;
                const ast = this.parsePipe();
                const source = this.input.substring(start - this.offset, this.inputIndex - this.offset);
                expression =
                    new AstSource(ast, source, this.location, this.absoluteOffset, this.errors);
            }

            bindings.push(new TemplateBinding(
                this.range(start), this.sourceRange(start), key, isVar, name, expression));
            if (this.peekKeywordAs() && !isVar) {
                const letStart = this.inputIndex;
                this.advance();                                   // consume `as`
                const letName = this.expectTemplateBindingKey();  // read local var name
                bindings.push(new TemplateBinding(
                    this.range(letStart), this.sourceRange(letStart), letName, true, key, null!));
            }
            if (!this.optionalCharacter(chars.$SEMICOLON)) {
                this.optionalCharacter(chars.$COMMA);
            }
        } while (this.index < this.tokens.length);

        return new TemplateBindingParseResult(bindings, warnings, this.errors);
    }

    error(message: string, index: number | null = null) {
        this.errors.push(new ParserError(message, this.input, this.locationText(index), this.location));
        this.skip();
    }

    private locationText(index: number | null = null) {
        if (index == null) {
            index = this.index;
        }
        return (index < this.tokens.length) ? `at column ${this.tokens[index].index + 1} in` :
            `at the end of the expression`;
    }

    // Error recovery should skip tokens until it encounters a recovery point. skip() treats
    // the end of input and a ';' as unconditionally a recovery point. It also treats ')',
    // '}' and ']' as conditional recovery points if one of calling productions is expecting
    // one of these symbols. This allows skip() to recover from errors such as '(a.) + 1' allowing
    // more of the Ast to be retained (it doesn't skip any tokens as the ')' is retained because
    // of the '(' begins an '(' <expr> ')' production). The recovery points of grouping symbols
    // must be conditional as they must be skipped if none of the calling productions are not
    // expecting the closing token else we will never make progress in the case of an
    // extraneous group closing symbol (such as a stray ')'). This is not the case for ';' because
    // parseChain() is always the root production and it expects a ';'.

    // If a production expects one of these token it increments the corresponding nesting count,
    // and then decrements it just prior to checking if the token is in the input.
    private skip() {
        let n = this.next;
        while (this.index < this.tokens.length && !n.isCharacter(chars.$SEMICOLON) &&
            (this.rparensExpected <= 0 || !n.isCharacter(chars.$RPAREN)) &&
            (this.rbracesExpected <= 0 || !n.isCharacter(chars.$RBRACE)) &&
            (this.rbracketsExpected <= 0 || !n.isCharacter(chars.$RBRACKET))) {
            if (this.next.isError()) {
                this.errors.push(new ParserError(
                    this.next.toString()!, this.input, this.locationText(), this.location));
            }
            this.advance();
            n = this.next;
        }
    }
}

class SimpleExpressionChecker implements AstVisitor {
    static check(ast: Ast): string[] {
        const s = new SimpleExpressionChecker();
        ast.visit(s);
        return s.errors;
    }

    errors: string[] = [];

    visitImplicitReceiver(ast: ImplicitReceiver, context: any) { }

    visitInterpolation(ast: Interpolation, context: any) { }

    visitLiteralPrimitive(ast: LiteralPrimitive, context: any) { }

    visitPropertyRead(ast: PropertyRead, context: any) { }

    visitPropertyWrite(ast: PropertyWrite, context: any) { }

    visitSafePropertyRead(ast: SafePropertyRead, context: any) { }

    visitMethodCall(ast: MethodCall, context: any) { }

    visitSafeMethodCall(ast: SafeMethodCall, context: any) { }

    visitFunctionCall(ast: FunctionCall, context: any) { }

    visitLiteralArray(ast: LiteralArray, context: any) { this.visitAll(ast.expressions); }

    visitLiteralMap(ast: LiteralMap, context: any) { this.visitAll(ast.values); }

    visitBinary(ast: Binary, context: any) { }

    visitPrefixNot(ast: PrefixNot, context: any) { }

    visitNonNullAssert(ast: NonNullAssert, context: any) { }

    visitConditional(ast: Conditional, context: any) { }

    visitPipe(ast: BindingPipe, context: any) { this.errors.push('pipes'); }

    visitKeyedRead(ast: KeyedRead, context: any) { }

    visitKeyedWrite(ast: KeyedWrite, context: any) { }

    visitAll(asts: any[]): any[] { return asts.map(node => node.visit(this)); }

    visitChain(ast: Chain, context: any) { }

    visitQuote(ast: Quote, context: any) { }
}
